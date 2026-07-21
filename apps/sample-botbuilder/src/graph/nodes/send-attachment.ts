import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function sendAttachmentNode(state: BotStateType, config?: GraphConfigNode) {
  const input = config?.data?.input as Record<string, unknown> | undefined;
  const caption = (input?.caption as string) || '';
  const filePathVar = (input?.filePathVar as string) || 'filePath';

  const filePath = state.variables?.[filePathVar] as string | undefined;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // No file to send — silently skip (tool-agent hasn't generated it yet)
  if (!filePath) {
    logger.info('[send-attachment] no file to send, skipping');
    return {};
  }

  if (!botToken) {
    logger.error('[send-attachment] TELEGRAM_BOT_TOKEN not set');
    return {};
  }

  logger.info(`[send-attachment] sending file: ${filePath}`);

  try {
    const { sendDocument } = await import('@common/node/comms/telegram2/outbound');
    await sendDocument(botToken, state.chatId, filePath, {
      caption: caption || undefined,
      parse_mode: 'HTML',
    });
    logger.info('[send-attachment] file sent successfully');
  } catch (err) {
    logger.error('[send-attachment] failed to send file:', (err as Error).message);
  }

  return {};
}
