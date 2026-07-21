import { Annotation } from '@langchain/langgraph';

export const BotState = Annotation.Root({
  chatId: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  userName: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  message: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  messageType: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => 'text',
  }),
  history: Annotation<Array<{ role: 'user' | 'bot'; content: string }>>({
    reducer: (current, update) => (update ? [...current, ...update] : current),
    default: () => [],
  }),
  variables: Annotation<Record<string, unknown>>({
    reducer: (_current, update) => update,
    default: () => ({}),
  }),
  agentResponse: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  nextEdge: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  conditionResult: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  handoverRequired: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  sessionEnded: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  requireUserInput: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => true,
  }),
});

export type BotStateType = typeof BotState.State;

export interface GraphConfigNode {
  id: string;
  type: string;
  data: { input?: Record<string, unknown> };
}

export interface GraphConfigEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphConfig {
  name: string;
  description?: string;
  nodes: GraphConfigNode[];
  edges: GraphConfigEdge[];
}
