import type { BotStateType } from '../state.ts';

export async function triggerNode(state: BotStateType): Promise<Partial<typeof state>> {
  logger.info(`trigger: user=${state.chatId}, message="${state.message.slice(0, 100)}"`);
  return {};
}
