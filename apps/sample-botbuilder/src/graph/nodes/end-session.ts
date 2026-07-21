import type { BotStateType } from '../state.ts';

export async function endSessionNode(state: BotStateType) {
  // If previous nodes already sent messages, just end the session
  if (state.pendingMessages?.length > 0) return { sessionEnded: true };

  const msg = 'Thank you! Have a great day.';
  return { agentResponse: msg, pendingMessages: [msg], sessionEnded: true };
}
