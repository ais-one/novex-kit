import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function listenTriggerNode(_state: BotStateType, _config?: GraphConfigNode) {
  // Terminal node — just pause and wait for next user message.
  // Intent classification happens in service.ts when the user replies.
  return { requireUserInput: true };
}
