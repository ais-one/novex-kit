import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseWebhook } from '@common/node/comms/whatsapp2/inbound';
import {
  getMediaUrl,
  markAsRead,
  sendAddressRequest,
  sendAudio,
  sendButtons,
  sendContacts,
  sendCtaUrlButton,
  sendDocument,
  sendFlow,
  sendImage,
  sendList,
  sendLocation,
  sendReaction,
  sendSticker,
  sendTemplate,
  sendText,
  sendTypingIndicator,
  sendVideo,
} from '@common/node/comms/whatsapp2/outbound';
import type {
  WaAddressRequestOpts,
  WaButtonsOpts,
  WaContact,
  WaCtaUrlOpts,
  WaFlowOpts,
  WaListOpts,
  WaMediaInput,
  WaTemplateOpts,
} from '@common/node/comms/whatsapp2/types';
import type { Request, Response } from 'express';
import express from 'express';

// WhatsApp Cloud API webhook handler
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
//
// Required env vars (set in .env.local):
//   WHATSAPP_APP_SECRET      — from Meta App Dashboard → App Settings → Basic → App Secret
//   WHATSAPP_VERIFY_TOKEN    — your own secret string (used once during webhook registration)
//   WHATSAPP_TOKEN           — permanent system user access token
//   WHATSAPP_PHONE_NUMBER_ID — phone number ID from Meta App Dashboard

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mediaFrom(p: Record<string, unknown>): WaMediaInput {
  if (typeof p.id === 'string') return { id: p.id };
  if (typeof p.link === 'string') return { link: p.link };
  throw new Error('Either id or link is required for media');
}

// ─── Type handlers for /test ──────────────────────────────────────────────────

async function handleText(token: string, phoneId: string, dest: string, p: Record<string, unknown>) {
  return sendText(token, phoneId, dest, String(p.body ?? ''), { preview_url: Boolean(p.preview_url) });
}

async function handleMedia(type: string, token: string, phoneId: string, dest: string, p: Record<string, unknown>) {
  const media = mediaFrom(p);
  const caption = typeof p.caption === 'string' ? p.caption : undefined;
  switch (type) {
    case 'image':
      return sendImage(token, phoneId, dest, media, { caption });
    case 'audio':
      return sendAudio(token, phoneId, dest, media);
    case 'video':
      return sendVideo(token, phoneId, dest, media, { caption });
    case 'sticker':
      return sendSticker(token, phoneId, dest, media);
    case 'document':
      return sendDocument(token, phoneId, dest, media, {
        caption,
        filename: typeof p.filename === 'string' ? p.filename : undefined,
      });
    default:
      return undefined;
  }
}

async function handleTestType(
  type: string,
  token: string,
  phoneId: string,
  dest: string,
  p: Record<string, unknown>,
  res: Response,
): Promise<unknown> {
  switch (type) {
    case 'text':
      return handleText(token, phoneId, dest, p);
    case 'image':
    case 'audio':
    case 'video':
    case 'sticker':
    case 'document':
      return handleMedia(type, token, phoneId, dest, p);
    case 'location':
      return sendLocation(token, phoneId, dest, {
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        name: typeof p.name === 'string' ? p.name : undefined,
        address: typeof p.address === 'string' ? p.address : undefined,
      });
    case 'contacts':
      return sendContacts(token, phoneId, dest, p.contacts as WaContact[]);
    case 'buttons':
      return sendButtons(token, phoneId, dest, p as unknown as WaButtonsOpts);
    case 'list':
      return sendList(token, phoneId, dest, p as unknown as WaListOpts);
    case 'template':
      return sendTemplate(token, phoneId, dest, p as unknown as WaTemplateOpts);
    case 'reaction':
      return sendReaction(token, phoneId, dest, String(p.message_id ?? ''), String(p.emoji ?? ''));
    case 'read':
      return markAsRead(token, phoneId, String(p.message_id ?? ''));
    case 'typing': {
      const msgId = String(p.message_id ?? '');
      if (!msgId) {
        res.status(400).json({ ok: false, error: 'message_id is required for typing indicator' });
        return null;
      }
      return sendTypingIndicator(token, phoneId, msgId);
    }
    case 'cta_url':
      return sendCtaUrlButton(token, phoneId, dest, p as unknown as WaCtaUrlOpts);
    case 'address_request':
      return sendAddressRequest(token, phoneId, dest, p as unknown as WaAddressRequestOpts);
    case 'flow':
      return sendFlow(token, phoneId, dest, p as unknown as WaFlowOpts);
    case 'get_media_url': {
      const mediaId = String(p.media_id ?? '');
      if (!mediaId) {
        res.status(400).json({ ok: false, error: 'media_id is required' });
        return null;
      }
      return { url: await getMediaUrl(token, mediaId) };
    }
    default:
      res.status(400).json({ ok: false, error: `Unknown type: ${type}` });
      return null;
  }
}

export default express
  .Router()

  // ── GET /api/sample-api/whatsapp/webhook ────────────────────────────────────
  // Meta calls this once when you click "Verify and save" in the App Dashboard.
  // Your server must echo back hub.challenge or the webhook will not be registered.
  .get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      // Echo challenge as plain text — sanitize to prevent reflected XSS
      res
        .set('Content-Type', 'text/plain')
        .status(200)
        .send(String(challenge ?? ''));
    } else {
      res.sendStatus(403);
    }
  })

  // ── POST /api/sample-api/whatsapp/webhook ───────────────────────────────────
  // Meta sends every inbound message here.
  // Respond 200 immediately — Meta will retry if you don't.
  .post('/webhook', async (req, res) => {
    // ── Signature verification ────────────────────────────────────────────────
    // Meta signs every POST with HMAC-SHA256 of the raw body using the App Secret.
    // Skip check if WHATSAPP_APP_SECRET is not configured (dev convenience).
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const sig = String(req.headers['x-hub-signature-256'] ?? '');
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        res.sendStatus(403);
        return;
      }
      const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        res.sendStatus(403);
        return;
      }
    }

    res.sendStatus(200); // always ack first

    const body = req.body;

    // Safety check — only handle whatsapp_business_account events
    if (body?.object !== 'whatsapp_business_account') return;

    const { WHATSAPP_TOKEN: token = '', WHATSAPP_PHONE_NUMBER_ID: phoneId = '' } = process.env;
    const { messages } = parseWebhook(body);

    if (messages.length === 0) return;
    if (!token || !phoneId) return; // silently skip if env not configured

    const msg = messages[0];

    // Only handle inbound text messages for now
    if (msg.content.type !== 'text') return;

    const userText = msg.content.body.trim().toLowerCase();

    // ── Simple echo / greeting handler ─────────────────────────────────────
    // Extend this block to add more commands or wire in an AI agent later.
    let reply: string;

    if (userText === 'hello' || userText === 'hi') {
      reply = 'Hi! What can I help you with?';
    } else {
      reply = `You said: "${msg.content.body}". (This bot is a work in progress.)`;
    }

    await sendText(token, phoneId, msg.from, reply);
  })

  // ── POST /api/sample-api/whatsapp/send ──────────────────────────────────────
  // Simple text send — no auth. Body: { to, message }
  .post('/send', async (req: Request, res: Response) => {
    const { to, message } = req.body as { to?: string; message?: string };
    if (!to || !message) {
      res.status(400).json({ ok: false, error: 'to and message are required' });
      return;
    }
    try {
      const { WHATSAPP_TOKEN: token = '', WHATSAPP_PHONE_NUMBER_ID: phoneId = '' } = process.env;
      if (!token || !phoneId) {
        res.status(500).json({ ok: false, error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set' });
        return;
      }
      await sendText(token, phoneId, to, message);
      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /api/sample-api/whatsapp/test ──────────────────────────────────────
  // Multi-type test dispatcher — no auth.
  // Body: { type, to, ...type-specific fields }
  // See WhatsAppTest.vue for sample payloads per type.
  .post('/test', async (req: Request, res: Response) => {
    const { WHATSAPP_TOKEN: token = '', WHATSAPP_PHONE_NUMBER_ID: phoneId = '' } = process.env;

    if (!token || !phoneId) {
      res.status(500).json({ ok: false, error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set' });
      return;
    }

    const { type, to, ...p } = req.body as Record<string, unknown>;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ ok: false, error: 'type is required' });
      return;
    }

    if (type !== 'read' && type !== 'typing' && type !== 'get_media_url' && !to) {
      res.status(400).json({ ok: false, error: 'to is required' });
      return;
    }

    try {
      const dest = to as string;
      const result = await handleTestType(type, token, phoneId, dest, p, res);
      if (result === null) return; // response already sent by handler
      res.json({ ok: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      res.status(500).json({ ok: false, error: message });
    }
  });
