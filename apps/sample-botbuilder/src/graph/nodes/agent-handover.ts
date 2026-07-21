import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function agentHandoverNode(state: BotStateType, config?: GraphConfigNode) {
  const message = (config?.data?.input?.message as string) || 'Transferring you to a human agent...';
  return { agentResponse: message, pendingMessages: [message], handoverRequired: true, sessionEnded: true };
}
