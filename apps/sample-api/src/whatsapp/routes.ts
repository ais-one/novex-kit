import { createHmac, timingSafeEqual } from 'node:crypto';
import { resolveCommsConfigByIdentity, resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
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
// Multi-config architecture:
//   - Each tenant can have multiple WhatsApp configs (different phone numbers / Meta Apps)
//   - Inbound webhooks are routed by phone_number_id from the payload
//   - Signature verification uses per-config app_secret (from credentials)
//   - Webhook verification (GET) checks verify_token against all stored configs
//   - Falls back to env vars (WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN) for backward compat

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verify HMAC-SHA256 signature from Meta webhook */
function verifySignature(appSecret: string, rawBody: Buffer, signatureHeader: string): boolean {
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

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
  // Supports multi-config: checks verify_token against all stored WhatsApp configs.
  .get('/webhook', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'] as string | undefined;
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token) {
      // Try to find a config with this verify_token
      const config = await resolveCommsConfigByIdentity('whatsapp', 'verify_token', token);

      if (config) {
        res
          .set('Content-Type', 'text/plain')
          .status(200)
          .send(String(challenge ?? ''));
        return;
      }

      // Fallback: check legacy env var for backward compatibility
      if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res
          .set('Content-Type', 'text/plain')
          .status(200)
          .send(String(challenge ?? ''));
        return;
      }
    }

    res.sendStatus(403);
  })

  // ── POST /api/sample-api/whatsapp/webhook ───────────────────────────────────
  // Meta sends every inbound message here.
  // Multi-config: resolves config by phone_number_id, verifies signature per-config.
  .post('/webhook', async (req, res) => {
    // Always respond 200 immediately — Meta will retry if you don't (< 5s requirement)
    res.sendStatus(200);

    const body = req.body;

    // Safety check — only handle whatsapp_business_account events
    if (body?.object !== 'whatsapp_business_account') return;

    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    const signatureHeader = String(req.headers['x-hub-signature-256'] ?? '');

    // Parse webhook to extract phone_number_id for config resolution
    const { phoneNumberId, messages } = parseWebhook(body);

    if (!phoneNumberId) {
      console.warn('WA webhook: no phone_number_id in payload');
      return;
    }

    // Resolve config by phone_number_id
    const config = await resolveCommsConfigByIdentity('whatsapp', 'phone_number_id', phoneNumberId);

    if (config) {
      // Verify signature using config's app_secret
      const appSecret = config.credentials.app_secret;
      if (appSecret && rawBody) {
        if (!verifySignature(appSecret, rawBody, signatureHeader)) {
          console.error('WA webhook: signature verification failed for config', config.label);
          return;
        }
      }

      // Process messages in tenant context
      if (messages.length === 0) return;

      const token = config.credentials.token;
      const phoneId = config.senderIdentity.phone_number_id;
      const msg = messages[0];

      // Only handle inbound text messages for now
      if (msg.content.type !== 'text') return;

      const userText = msg.content.body.trim().toLowerCase();

      // Simple echo / greeting handler — extend or replace with AI/service layer
      let reply: string;
      if (userText === 'hello' || userText === 'hi') {
        reply = 'Hi! What can I help you with?';
      } else {
        reply = `You said: "${msg.content.body}". (This bot is a work in progress.)`;
      }

      await sendText(token, phoneId, msg.from, reply);
      return;
    }

    // Fallback: legacy env-var based handling (backward compatibility)
    const legacyAppSecret = process.env.WHATSAPP_APP_SECRET;
    if (legacyAppSecret && rawBody) {
      if (!verifySignature(legacyAppSecret, rawBody, signatureHeader)) {
        console.error('WA webhook: legacy signature verification failed');
        return;
      }
    }

    const { WHATSAPP_TOKEN: legacyToken = '', WHATSAPP_PHONE_NUMBER_ID: legacyPhoneId = '' } = process.env;
    if (messages.length === 0) return;
    if (!legacyToken || !legacyPhoneId) return;

    const msg = messages[0];
    if (msg.content.type !== 'text') return;

    const userText = msg.content.body.trim().toLowerCase();
    let reply: string;
    if (userText === 'hello' || userText === 'hi') {
      reply = 'Hi! What can I help you with?';
    } else {
      reply = `You said: "${msg.content.body}". (This bot is a work in progress.)`;
    }

    await sendText(legacyToken, legacyPhoneId, msg.from, reply);
  })

  // ── POST /api/sample-api/whatsapp/send ──────────────────────────────────────
  // Simple text send. Body: { to, message }
  // Requires authenticated user with tenant_id for credential resolution.
  .post('/send', async (req: Request, res: Response) => {
    const { to, message, configLabel } = req.body as { to?: string; message?: string; configLabel?: string };
    if (!to || !message) {
      res.status(400).json({ ok: false, error: 'to and message are required' });
      return;
    }
    try {
      const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
      if (!tenantId) {
        res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
        return;
      }
      const config = await resolveCommsCredentials(tenantId, 'whatsapp', configLabel);
      const token = config.credentials.token;
      const phoneId = config.senderIdentity.phone_number_id;
      await sendText(token, phoneId, to, message);
      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /api/sample-api/whatsapp/test ──────────────────────────────────────
  // Multi-type test dispatcher.
  // Body: { type, to, ...type-specific fields }
  // Requires authenticated user with tenant_id for credential resolution.
  // See WhatsAppTest.vue for sample payloads per type.
  .post('/test', async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { type, to, configLabel, ...p } = req.body as Record<string, unknown>;

    let token: string;
    let phoneId: string;
    try {
      const config = await resolveCommsCredentials(tenantId, 'whatsapp', configLabel as string | undefined);
      token = config.credentials.token;
      phoneId = config.senderIdentity.phone_number_id;
    } catch (err: unknown) {
      res
        .status(500)
        .json({ ok: false, error: err instanceof Error ? err.message : 'Failed to resolve WhatsApp credentials' });
      return;
    }

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
