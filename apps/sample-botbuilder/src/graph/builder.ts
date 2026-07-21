import { StateGraph } from '@langchain/langgraph';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { agentHandoverNode } from './nodes/agent-handover.ts';
import { conditionalNode } from './nodes/conditional.ts';
import { endSessionNode } from './nodes/end-session.ts';
import { listenTriggerNode } from './nodes/listen-trigger.ts';
import { type EdgeInfo, routerAgentNode } from './nodes/router-agent.ts';
import { sendAttachmentNode } from './nodes/send-attachment.ts';
import { textNode } from './nodes/text.ts';
import { toolAgentNode } from './nodes/tool-agent.ts';
import { triggerNode } from './nodes/trigger.ts';
import { BotState, type BotStateType, type GraphConfig } from './state.ts';

function logWrap(nodeId: string, nodeType: string, fn: (state: BotStateType) => unknown) {
  return async (state: BotStateType) => {
    logger.info(`[node] ${nodeType} (${nodeId}) — start`);
    const result = await fn(state);
    const r = result as Record<string, unknown>;
    const summary = r?.agentResponse ? ` agentResponse="${String(r.agentResponse).slice(0, 60)}"` : '';
    logger.info(`[node] ${nodeType} (${nodeId}) — done${summary}`);
    return { ...r, lastNodeId: nodeId };
  };
}

function addStartEdge(graph: StateGraph<unknown>, target: string) {
  (graph as unknown as { addEdge: (s: string, t: string) => void }).addEdge('__start__', target);
}
function addEndEdge(graph: StateGraph<unknown>, source: string) {
  (graph as unknown as { addEdge: (s: string, t: string) => void }).addEdge(source, '__end__');
}
function addEdge(graph: StateGraph<unknown>, source: string, target: string) {
  (graph as unknown as { addEdge: (s: string, t: string) => void }).addEdge(source, target);
}
function addConditionalEdges(
  graph: StateGraph<unknown>,
  source: string,
  fn: (state: unknown) => string,
  routes: Record<string, string>,
) {
  (
    graph as unknown as {
      addConditionalEdges: (s: string, f: (state: unknown) => string, r: Record<string, string>) => void;
    }
  ).addConditionalEdges(source, fn, routes);
}

export async function buildGraph(config: GraphConfig, mcpClient?: Client) {
  const graph = new StateGraph(BotState);

  const nodeIds = new Set(config.nodes.map(n => n.id));
  const triggerNodeId = config.nodes.find(n => n.type === 'trigger')?.id;

  for (const node of config.nodes) {
    switch (node.type) {
      case 'trigger':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => triggerNode(state)),
        );
        break;
      case 'text':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => textNode(state, node)),
        );
        break;
      case 'conditional':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => conditionalNode(state, node)),
        );
        break;
      case 'tool-agent':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => toolAgentNode(state, mcpClient!, node)),
        );
        break;
      case 'router-agent': {
        // Auto-generate edge info from outgoing edges and target node descriptions
        const outgoing = config.edges.filter(e => e.source === node.id);
        const edgeInfo: EdgeInfo[] = outgoing.map(e => {
          const targetNode = config.nodes.find(n => n.id === e.target);
          const targetLabel = (targetNode?.data?.input as Record<string, unknown>)?.label as string;
          const targetDesc = (targetNode?.data?.input as Record<string, unknown>)?.description as string;
          return {
            label: e.label || 'fallback',
            description: targetDesc || targetLabel || e.label || '',
            target: e.target,
          };
        });
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => routerAgentNode(state, node, edgeInfo)),
        );
        break;
      }
      case 'agent-handover':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => agentHandoverNode(state, node)),
        );
        break;
      case 'end-session':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => endSessionNode(state)),
        );
        break;
      case 'listen-trigger':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => listenTriggerNode(state, node)),
        );
        break;
      case 'send-attachment':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => sendAttachmentNode(state, node)),
        );
        break;
    }
  }

  // Conditional start: resume from resumeNodeId if set, otherwise start from trigger
  const startRoutes: Record<string, string> = {};
  for (const id of nodeIds) startRoutes[id] = id;
  if (triggerNodeId) startRoutes['__default__'] = triggerNodeId;

  addConditionalEdges(
    graph,
    '__start__',
    state => {
      const s = state as BotStateType;
      const resume = s.resumeNodeId;
      if (resume && nodeIds.has(resume)) {
        logger.info(`[graph] resuming from node: ${resume}`);
        return resume;
      }
      return '__default__';
    },
    startRoutes,
  );

  const processedSources = new Set<string>();

  for (const edge of config.edges) {
    const sourceNode = config.nodes.find(n => n.id === edge.source);
    if (!sourceNode) continue;

    if (sourceNode.type === 'router-agent') {
      if (processedSources.has(edge.source)) continue;
      processedSources.add(edge.source);
      const outgoing = config.edges.filter(e => e.source === edge.source);
      const routes: Record<string, string> = {};
      for (const e of outgoing) routes[e.label || 'fallback'] = e.target;
      addConditionalEdges(
        graph,
        edge.source,
        state => {
          const s = state as BotStateType;
          const edge = s.nextEdge || 'fallback';
          logger.info(`[router] ${edge} → ${routes[edge] || 'fallback'}`);
          return edge;
        },
        routes,
      );
    } else if (sourceNode.type === 'conditional') {
      if (processedSources.has(edge.source)) continue;
      processedSources.add(edge.source);
      const outgoing = config.edges.filter(e => e.source === edge.source);
      const routes: Record<string, string> = {};
      for (const e of outgoing) routes[e.label || 'source-else'] = e.target;
      addConditionalEdges(
        graph,
        edge.source,
        state => {
          const s = state as BotStateType;
          const result = s.conditionResult || 'source-else';
          logger.info(`[conditional] ${result} → ${routes[result] || 'source-else'}`);
          return result;
        },
        routes,
      );
    } else if (sourceNode.type === 'listen-trigger') {
    } else if (sourceNode.type === 'text' && (sourceNode.data?.input as Record<string, unknown>)?.captureData) {
    } else {
      if (processedSources.has(edge.source)) continue;
      processedSources.add(edge.source);
      logger.info(`[edge] ${edge.source} → ${edge.target}`);
      addEdge(graph, edge.source, edge.target);
    }
  }

  // listen-trigger: terminal node, always routes to __end__
  for (const node of config.nodes) {
    if (node.type === 'listen-trigger' && !processedSources.has(node.id)) {
      processedSources.add(node.id);
      addEndEdge(graph, node.id);
    }
  }

  // captureData text nodes: send message first visit, capture input on resume
  for (const node of config.nodes) {
    if (
      node.type === 'text' &&
      (node.data?.input as Record<string, unknown>)?.captureData &&
      !processedSources.has(node.id)
    ) {
      processedSources.add(node.id);
      const outgoing = config.edges.filter(e => e.source === node.id);

      if (outgoing.length > 0) {
        const routes: Record<string, string> = {
          __resume__: outgoing[0].target,
          __pause__: '__end__',
        };
        // biome-ignore lint/suspicious/noExplicitAny: graph type workaround
        (graph as any).addConditionalEdges(
          node.id,
          (state: unknown) => {
            const s = state as BotStateType;
            const result = s.resumeNodeId === node.id ? '__resume__' : '__pause__';
            logger.info(`[captureData] ${node.id} → ${result === '__resume__' ? outgoing[0].target : 'END (pause)'}`);
            return result;
          },
          routes,
        );
      } else {
        addEndEdge(graph, node.id);
      }
    }
  }

  // agent-handover and end-session route to __end__ if no outgoing edges
  for (const node of config.nodes) {
    if (
      (node.type === 'agent-handover' || node.type === 'end-session') &&
      !config.edges.some(e => e.source === node.id)
    ) {
      addEndEdge(graph, node.id);
    }
  }

  return graph.compile();
}
