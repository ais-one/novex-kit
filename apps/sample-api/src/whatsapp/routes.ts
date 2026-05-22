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
      res.status(200).send(challenge);
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
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
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

    if (!type) {
      res.status(400).json({ ok: false, error: 'type is required' });
      return;
    }

    if (type !== 'read' && type !== 'typing' && type !== 'get_media_url' && !to) {
      res.status(400).json({ ok: false, error: 'to is required' });
      return;
    }

    try {
      let result: unknown;
      const dest = to as string;

      switch (type) {
        case 'text':
          result = await sendText(token, phoneId, dest, String(p.body ?? ''), {
            preview_url: Boolean(p.preview_url),
          });
          break;

        case 'image':
          result = await sendImage(token, phoneId, dest, mediaFrom(p), {
            caption: p.caption ? String(p.caption) : undefined,
          });
          break;

        case 'audio':
          result = await sendAudio(token, phoneId, dest, mediaFrom(p));
          break;

        case 'document':
          result = await sendDocument(token, phoneId, dest, mediaFrom(p), {
            caption: p.caption ? String(p.caption) : undefined,
            filename: p.filename ? String(p.filename) : undefined,
          });
          break;

        case 'video':
          result = await sendVideo(token, phoneId, dest, mediaFrom(p), {
            caption: p.caption ? String(p.caption) : undefined,
          });
          break;

        case 'sticker':
          result = await sendSticker(token, phoneId, dest, mediaFrom(p));
          break;

        case 'location':
          result = await sendLocation(token, phoneId, dest, {
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            name: p.name ? String(p.name) : undefined,
            address: p.address ? String(p.address) : undefined,
          });
          break;

        case 'contacts':
          result = await sendContacts(token, phoneId, dest, p.contacts as WaContact[]);
          break;

        case 'buttons':
          result = await sendButtons(token, phoneId, dest, p as unknown as WaButtonsOpts);
          break;

        case 'list':
          result = await sendList(token, phoneId, dest, p as unknown as WaListOpts);
          break;

        case 'template':
          result = await sendTemplate(token, phoneId, dest, p as unknown as WaTemplateOpts);
          break;

        case 'reaction':
          result = await sendReaction(token, phoneId, dest, String(p.message_id ?? ''), String(p.emoji ?? ''));
          break;

        case 'read':
          result = await markAsRead(token, phoneId, String(p.message_id ?? ''));
          break;

        case 'typing': {
          const msgId = String(p.message_id ?? '');
          if (!msgId) {
            res.status(400).json({ ok: false, error: 'message_id is required for typing indicator' });
            return;
          }
          result = await sendTypingIndicator(token, phoneId, msgId);
          break;
        }

        case 'cta_url':
          result = await sendCtaUrlButton(token, phoneId, dest, p as unknown as WaCtaUrlOpts);
          break;

        case 'address_request':
          result = await sendAddressRequest(token, phoneId, dest, p as unknown as WaAddressRequestOpts);
          break;

        case 'flow':
          result = await sendFlow(token, phoneId, dest, p as unknown as WaFlowOpts);
          break;

        case 'get_media_url': {
          const mediaId = String(p.media_id ?? '');
          if (!mediaId) {
            res.status(400).json({ ok: false, error: 'media_id is required' });
            return;
          }
          result = { url: await getMediaUrl(token, mediaId) };
          break;
        }

        default:
          res.status(400).json({ ok: false, error: `Unknown type: ${type}` });
          return;
      }

      res.json({ ok: true, result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

function mediaFrom(p: Record<string, unknown>): WaMediaInput {
  if (p.id) return { id: String(p.id) };
  if (p.link) return { link: String(p.link) };
  throw new Error('Either id or link is required for media');
}
