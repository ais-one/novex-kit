import { StateGraph } from '@langchain/langgraph';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { agentHandoverNode } from './nodes/agent-handover.ts';
import { conditionalNode } from './nodes/conditional.ts';
import { endSessionNode } from './nodes/end-session.ts';
import { routerAgentNode } from './nodes/router-agent.ts';
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
    return result;
  };
}

// LangGraph types are strict about '__start__' and '__end__' literals
// These helpers provide type-safe wrappers
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
      case 'router-agent':
        graph.addNode(
          node.id,
          logWrap(node.id, node.type, state => routerAgentNode(state, node)),
        );
        break;
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
          logWrap(node.id, node.type, state => state),
        );
        break;
    }
  }

  const triggerNodeId = config.nodes.find(n => n.type === 'trigger')?.id;
  if (triggerNodeId) addStartEdge(graph, triggerNodeId);

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
          logger.info(`[router] ${edge} → ${routes[edge] || '?'}`);
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
          logger.info(`[conditional] ${result} → ${routes[result] || '?'}`);
          return result;
        },
        routes,
      );
    } else {
      if (processedSources.has(edge.source)) continue;
      processedSources.add(edge.source);
      logger.info(`[edge] ${edge.source} → ${edge.target}`);
      addEdge(graph, edge.source, edge.target);
    }
  }

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
