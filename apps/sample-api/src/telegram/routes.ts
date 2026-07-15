import { authUser } from '@common/node/auth/jwt';
import { enqueueBroadcast } from '@common/node/comms/service/outbox';
import { send } from '@common/node/comms/service/send';
import type { SendRequest } from '@common/node/comms/service/types';
import { handleUpdate } from '@common/node/comms/telegram2/inbound';
import {
  copyMessage,
  deleteMessage,
  editMessageCaption,
  editMessageReplyMarkup,
  editMessageText,
  forwardMessage,
  pinMessage,
  sendChatAction,
  sendMediaGroup,
  sendMessage,
  unpinMessage,
} from '@common/node/comms/telegram2/outbound';
import type { MediaGroupItem, TelegramMessageOpts } from '@common/node/comms/telegram2/types';
import { resolveCommsConfigByLabel } from '@common/node/comms/tenant/resolver';
import type { Request, Response } from 'express';
import express from 'express';

// Telegram Bot API test dispatcher
// Docs: https://core.telegram.org/bots/api/
//
// Credentials are resolved per-tenant from the database via the unified comms service.
// Each tenant must configure their own Telegram Bot Token in the Comms Config page.
//
// Required env var (for the legacy inbound webhook handler only):
//   TELEGRAM_API_KEY — Bot token (used to echo replies to inbound messages)

// ─── Types supported by the unified send() ────────────────────────────────────
const UNIFIED_TYPES = new Set([
  'message',
  'photo',
  'video',
  'audio',
  'document',
  'voice',
  'video_note',
  'sticker',
  'animation',
  'location',
  'venue',
  'contact',
  'poll',
  'dice',
]);

// ─── Handle types NOT in the unified service (need messageId, fromChatId, etc.) ─
async function handleNonUnifiedType(
  type: string,
  token: string,
  chatId: string,
  p: Record<string, unknown>,
  res: Response,
): Promise<unknown> {
  const opts = p as unknown as TelegramMessageOpts;

  switch (type) {
    case 'media_group':
      return sendMediaGroup(token, chatId, (p.media as MediaGroupItem[]) ?? [], opts);

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

  // ── POST /api/sample-api/telegram/webhook/:label ──────────────────────────
  // Multi-config webhook endpoint. Each bot config gets its own URL.
  // Telegram sends updates here after setWebhook is called with this URL.
  // Verifies the X-Telegram-Bot-Api-Secret-Token header against the config's webhook_secret.
  .post('/webhook/:label', async (req: Request, res: Response) => {
    const label = String(req.params.label);

    // 1. Resolve config by label
    const config = await resolveCommsConfigByLabel('telegram', label);
    if (!config) {
      res.sendStatus(404);
      return;
    }

    // 2. Verify secret_token header
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;
    if (!headerSecret || headerSecret !== config.credentials.webhook_secret) {
      res.sendStatus(401);
      return;
    }

    // 3. Respond 200 immediately (Telegram expects fast response)
    res.sendStatus(200);

    // 4. Parse and process with tenant context
    const parsed = handleUpdate(req.body);
    if (parsed?.updateType !== 'message') return;

    // biome-ignore lint/suspicious/noExplicitAny: parsed data shape varies by updateType
    const data = parsed.data as any;
    if (data.content?.type !== 'text') return;

    const chatId = String(data.chat?.id ?? '');
    const userText = String(data.content.text ?? '')
      .trim()
      .toLowerCase();

    // Simple echo handler — extend or replace with AI/service layer
    let reply: string;
    if (userText === 'hello' || userText === 'hi') {
      reply = 'Hi! What can I help you with?';
    } else {
      reply = `You said: "${data.content.text}". (This bot is a work in progress.)`;
    }

    await sendMessage(config.credentials.bot_token, chatId, reply);
  })

  // ── POST /api/sample-api/telegram/webhook ──────────────────────────────────
  // Legacy single-bot webhook endpoint (backward compatibility).
  // Uses TELEGRAM_API_KEY env var for bot replies (not tenant-scoped).
  .post('/webhook', async (req, res) => {
    res.sendStatus(200); // always ack first

    const token = process.env.TELEGRAM_API_KEY;
    if (!token) return;

    const parsed = handleUpdate(req.body);
    if (parsed?.updateType !== 'message') return;

    // biome-ignore lint/suspicious/noExplicitAny: parsed data shape varies by updateType
    const data = parsed.data as any;
    if (data.content?.type !== 'text') return;

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
  // Simple text send via unified comms service.
  // Body: { to, message, configLabel? }
  .post('/send', authUser, async (req: Request, res: Response) => {
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
      const result = await send({
        tenantId,
        configLabel,
        channel: 'telegram',
        to,
        type: 'text',
        payload: { text: message },
      });
      res.json({ ok: result.success, result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /api/sample-api/telegram/test ────────────────────────────────────
  // Multi-type test dispatcher.
  // Body: { type, to, configLabel?, ...type-specific fields }
  // Types in the unified service go through send(). Others use direct library calls.
  .post('/test', authUser, async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { type, to, configLabel, ...p } = req.body as Record<string, unknown>;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ ok: false, error: 'type is required' });
      return;
    }

    if (!to) {
      res.status(400).json({ ok: false, error: 'to (chatId) is required' });
      return;
    }

    const chatId = String(to);

    try {
      // Map test page type names to unified service type names
      const unifiedType = type === 'message' ? 'text' : type;

      if (UNIFIED_TYPES.has(type)) {
        // Use unified send() — handles credential resolution internally
        const result = await send({
          tenantId,
          configLabel: configLabel as string | undefined,
          channel: 'telegram',
          to: chatId,
          type: unifiedType,
          payload: p,
        } as unknown as SendRequest);
        if (!result.success) {
          res.status(500).json({ ok: false, error: result.error });
          return;
        }
        res.json({ ok: true, result });
      } else {
        // Non-unified types — resolve credentials manually, call library directly
        const { resolveCommsCredentials } = await import('@common/node/comms/tenant/resolver');
        const config = await resolveCommsCredentials(tenantId, 'telegram', configLabel as string | undefined);
        const token = config.credentials.bot_token;

        const result = await handleNonUnifiedType(type, token, chatId, p, res);
        if (result === null) return; // response already sent by handler
        res.json({ ok: true, result });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      res.status(500).json({ ok: false, error: message });
    }
  })

  // ── POST /api/sample-api/telegram/broadcast ───────────────────────────────
  // Enqueue broadcast message to outbox for async delivery.
  // Body: { recipients: string[], type, configLabel?, payload }
  // Example: { recipients: ["123", "456"], type: "text", payload: { text: "Hello everyone!" } }
  .post('/broadcast', authUser, async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { recipients, type, configLabel, ...payload } = req.body as Record<string, unknown>;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ ok: false, error: 'recipients (array of chatIds) is required' });
      return;
    }

    if (!type || typeof type !== 'string') {
      res.status(400).json({ ok: false, error: 'type is required' });
      return;
    }

    try {
      const result = await enqueueBroadcast({
        tenantId,
        configLabel: configLabel as string | undefined,
        channel: 'telegram',
        recipients: recipients as string[],
        type: type === 'message' ? 'text' : type,
        payload,
      });
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  });
