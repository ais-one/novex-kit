import { handleUpdate } from '@common/node/comms/telegram2/inbound';
import {
  copyMessage,
  deleteMessage,
  editMessageCaption,
  editMessageReplyMarkup,
  editMessageText,
  forwardMessage,
  pinMessage,
  sendAnimation,
  sendAudio,
  sendChatAction,
  sendContact,
  sendDice,
  sendDocument,
  sendLocation,
  sendMediaGroup,
  sendMessage,
  sendPhoto,
  sendPoll,
  sendSticker,
  sendVenue,
  sendVideo,
  sendVideoNote,
  sendVoice,
  unpinMessage,
} from '@common/node/comms/telegram2/outbound';
import type { ContactData, MediaGroupItem, TelegramMessageOpts, VenueData } from '@common/node/comms/telegram2/types';
import { resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
import type { Request, Response } from 'express';
import express from 'express';

// Telegram Bot API test dispatcher
// Docs: https://core.telegram.org/bots/api/
//
// Credentials are resolved per-tenant from the database via resolveCommsCredentials().
// Each tenant must configure their own Telegram Bot Token in the Comms Config page.
//
// Required env var (for the inbound webhook handler only):
//   TELEGRAM_API_KEY — Bot token (used to echo replies to inbound messages)

// ─── Type handlers for /test ──────────────────────────────────────────────────

async function handleTestType(
  type: string,
  token: string,
  chatId: string,
  p: Record<string, unknown>,
  res: Response,
): Promise<unknown> {
  const opts = p as unknown as TelegramMessageOpts;

  switch (type) {
    case 'message':
      return sendMessage(token, chatId, String(p.text ?? ''), opts);

    case 'photo':
      return sendPhoto(token, chatId, String(p.photo ?? ''), opts);

    case 'video':
      return sendVideo(token, chatId, String(p.video ?? ''), opts);

    case 'audio':
      return sendAudio(token, chatId, String(p.audio ?? ''), opts);

    case 'document':
      return sendDocument(token, chatId, String(p.document ?? ''), opts);

    case 'voice':
      return sendVoice(token, chatId, String(p.voice ?? ''), opts);

    case 'video_note':
      return sendVideoNote(token, chatId, String(p.video_note ?? ''), opts);

    case 'sticker':
      return sendSticker(token, chatId, String(p.sticker ?? ''), opts);

    case 'animation':
      return sendAnimation(token, chatId, String(p.animation ?? ''), opts);

    case 'media_group':
      return sendMediaGroup(token, chatId, (p.media as MediaGroupItem[]) ?? [], opts);

    case 'location':
      return sendLocation(token, chatId, Number(p.latitude), Number(p.longitude), opts);

    case 'venue':
      return sendVenue(token, chatId, p.venue as VenueData, opts);

    case 'contact':
      return sendContact(token, chatId, p.contact as ContactData, opts);

    case 'poll':
      return sendPoll(token, chatId, String(p.question ?? ''), (p.options as string[]) ?? [], opts);

    case 'dice':
      return sendDice(token, chatId, typeof p.emoji === 'string' ? p.emoji : '🎲', opts);

    case 'chat_action':
      return sendChatAction(token, chatId, String(p.action ?? 'typing'), opts);

    case 'forward': {
      if (!p.from_chat_id || !p.message_id) {
        res.status(400).json({ ok: false, error: 'from_chat_id and message_id are required for forward' });
        return null;
      }
      return forwardMessage(token, chatId, String(p.from_chat_id), Number(p.message_id), opts);
    }

    case 'copy': {
      if (!p.from_chat_id || !p.message_id) {
        res.status(400).json({ ok: false, error: 'from_chat_id and message_id are required for copy' });
        return null;
      }
      return copyMessage(token, chatId, String(p.from_chat_id), Number(p.message_id), opts);
    }

    case 'edit_text': {
      if (!p.message_id) {
        res.status(400).json({ ok: false, error: 'message_id is required for edit_text' });
        return null;
      }
      return editMessageText(token, chatId, Number(p.message_id), String(p.text ?? ''), opts);
    }

    case 'edit_caption': {
      if (!p.message_id) {
        res.status(400).json({ ok: false, error: 'message_id is required for edit_caption' });
        return null;
      }
      return editMessageCaption(token, chatId, Number(p.message_id), String(p.caption ?? ''), opts);
    }

    case 'edit_markup': {
      if (!p.message_id || !p.reply_markup) {
        res.status(400).json({ ok: false, error: 'message_id and reply_markup are required for edit_markup' });
        return null;
      }
      return editMessageReplyMarkup(token, chatId, Number(p.message_id), String(p.reply_markup));
    }

    case 'delete': {
      if (!p.message_id) {
        res.status(400).json({ ok: false, error: 'message_id is required for delete' });
        return null;
      }
      return deleteMessage(token, chatId, Number(p.message_id));
    }

    case 'pin': {
      if (!p.message_id) {
        res.status(400).json({ ok: false, error: 'message_id is required for pin' });
        return null;
      }
      return pinMessage(token, chatId, Number(p.message_id), opts);
    }

    case 'unpin': {
      if (!p.message_id) {
        res.status(400).json({ ok: false, error: 'message_id is required for unpin' });
        return null;
      }
      return unpinMessage(token, chatId, Number(p.message_id));
    }

    default:
      res.status(400).json({ ok: false, error: `Unknown type: ${type}` });
      return null;
  }
}

export default express
  .Router()

  // ── POST /api/sample-api/telegram/webhook ──────────────────────────────────
  // Telegram sends every update here as a POST.
  // Respond 200 immediately — Telegram will retry if you don't.
  // Uses TELEGRAM_API_KEY env var for bot replies (not tenant-scoped).
  // To register this webhook URL with Telegram, call:
  //   POST https://api.telegram.org/bot<TOKEN>/setWebhook
  //   Body: { url: "https://yourdomain.com/api/sample-api/telegram/webhook" }
  .post('/webhook', async (req, res) => {
    res.sendStatus(200); // always ack first

    const token = process.env.TELEGRAM_API_KEY;
    if (!token) return;

    const parsed = handleUpdate(req.body);
    if (!parsed || parsed.updateType !== 'message') return;

    // biome-ignore lint/suspicious/noExplicitAny: parsed data shape varies by updateType
    const data = parsed.data as any;
    if (!data?.content || data.content.type !== 'text') return;

    const chatId = String(data.chat?.id ?? '');
    const userText = String(data.content.text ?? '')
      .trim()
      .toLowerCase();

    let reply: string;
    if (userText === 'hello' || userText === 'hi') {
      reply = 'Hi! What can I help you with?';
    } else {
      reply = `You said: "${data.content.text}". (This bot is a work in progress.)`;
    }

    await sendMessage(token, chatId, reply);
  })

  // ── POST /api/sample-api/telegram/send ────────────────────────────────────
  // Simple text send. Body: { to, message, configLabel? }
  // Requires authenticated user with tenant_id for credential resolution.
  .post('/send', async (req: Request, res: Response) => {
    const { to, message, configLabel } = req.body as { to?: string; message?: string; configLabel?: string };
    if (!to || !message) {
      res.status(400).json({ ok: false, error: 'to (chatId) and message are required' });
      return;
    }
    try {
      const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
      if (!tenantId) {
        res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
        return;
      }
      const config = await resolveCommsCredentials(tenantId, 'telegram', configLabel);
      const token = config.credentials.bot_token;
      await sendMessage(token, to, message);
      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /api/sample-api/telegram/test ────────────────────────────────────
  // Multi-type test dispatcher.
  // Body: { type, to, configLabel?, ...type-specific fields }
  // Requires authenticated user with tenant_id for credential resolution.
  // See TelegramTest.vue for sample payloads per type.
  .post('/test', async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { type, to, configLabel, ...p } = req.body as Record<string, unknown>;

    let token: string;
    try {
      const config = await resolveCommsCredentials(tenantId, 'telegram', configLabel as string | undefined);
      token = config.credentials.bot_token;
    } catch (err: unknown) {
      res
        .status(500)
        .json({ ok: false, error: err instanceof Error ? err.message : 'Failed to resolve Telegram credentials' });
      return;
    }

    if (!type || typeof type !== 'string') {
      res.status(400).json({ ok: false, error: 'type is required' });
      return;
    }

    if (!to) {
      res.status(400).json({ ok: false, error: 'to (chatId) is required' });
      return;
    }

    try {
      const chatId = String(to);
      const result = await handleTestType(type, token, chatId, p, res);
      if (result === null) return;
      res.json({ ok: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      res.status(500).json({ ok: false, error: message });
    }
  });
