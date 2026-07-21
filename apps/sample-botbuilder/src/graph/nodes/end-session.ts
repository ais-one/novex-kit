import type { BotStateType } from '../state.ts';

export async function endSessionNode(state: BotStateType) {
  if (state.agentResponse) return { sessionEnded: true };
  return { agentResponse: 'Thank you! Have a great day.', sessionEnded: true };
}
