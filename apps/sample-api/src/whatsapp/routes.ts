import { enqueueBroadcast } from '@common/node/comms/service/outbox';
import { send } from '@common/node/comms/service/send';
import type { SendRequest } from '@common/node/comms/service/types';
import { resolveCommsConfigByIdentity, resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
import { parseWebhook, verifyWebhookSignature } from '@common/node/comms/whatsapp2/inbound';
import {
  getMediaUrl,
  markAsRead,
  sendReaction,
  sendText,
  sendTypingIndicator,
} from '@common/node/comms/whatsapp2/outbound';
import type { WaInboundText } from '@common/node/comms/whatsapp2/types';
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

// ─── Types supported by the unified send() ────────────────────────────────────
const UNIFIED_TYPES = new Set([
  'text',
  'image',
  'audio',
  'video',
  'document',
  'sticker',
  'location',
  'contacts',
  'template',
  'buttons',
  'list',
  'cta_url',
  'address_request',
  'flow',
]);

// ─── Handle types NOT in the unified service (need messageId, or are utility) ─
async function handleNonUnifiedType(
  type: string,
  token: string,
  phoneId: string,
  dest: string,
  p: Record<string, unknown>,
  res: Response,
): Promise<unknown> {
  switch (type) {
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
        if (!verifyWebhookSignature(appSecret, rawBody, signatureHeader)) {
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

      const textContent = msg.content as WaInboundText;
      const userText = textContent.body.trim().toLowerCase();

      // Simple echo / greeting handler — extend or replace with AI/service layer
      let reply: string;
      if (userText === 'hello' || userText === 'hi') {
        reply = 'Hi! What can I help you with?';
      } else {
        reply = `You said: "${textContent.body}". (This bot is a work in progress.)`;
      }

      await sendText(token, phoneId, msg.from, reply);
      return;
    }

    // Fallback: legacy env-var based handling (backward compatibility)
    const legacyAppSecret = process.env.WHATSAPP_APP_SECRET;
    if (legacyAppSecret && rawBody) {
      if (!verifyWebhookSignature(legacyAppSecret, rawBody, signatureHeader)) {
        console.error('WA webhook: legacy signature verification failed');
        return;
      }
    }

    const { WHATSAPP_TOKEN: legacyToken = '', WHATSAPP_PHONE_NUMBER_ID: legacyPhoneId = '' } = process.env;
    if (messages.length === 0) return;
    if (!legacyToken || !legacyPhoneId) return;

    const msg = messages[0];
    if (msg.content.type !== 'text') return;

    const textContent = msg.content as WaInboundText;
    const userText = textContent.body.trim().toLowerCase();
    let reply: string;
    if (userText === 'hello' || userText === 'hi') {
      reply = 'Hi! What can I help you with?';
    } else {
      reply = `You said: "${textContent.body}". (This bot is a work in progress.)`;
    }

    await sendText(legacyToken, legacyPhoneId, msg.from, reply);
  })

  // ── POST /api/sample-api/whatsapp/send ──────────────────────────────────────
  // Simple text send via unified comms service.
  // Body: { to, message, configLabel? }
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
      const result = await send({
        tenantId,
        configLabel,
        channel: 'whatsapp',
        to,
        type: 'text',
        payload: { text: message },
      });
      res.json({ ok: result.success, result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /api/sample-api/whatsapp/test ──────────────────────────────────────
  // Multi-type test dispatcher.
  // Body: { type, to, configLabel?, ...type-specific fields }
  // Types in the unified service go through send(). Others use direct library calls.
  .post('/test', async (req: Request, res: Response) => {
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

    if (type !== 'read' && type !== 'typing' && type !== 'get_media_url' && !to) {
      res.status(400).json({ ok: false, error: 'to is required' });
      return;
    }

    const dest = String(to ?? '');

    try {
      if (UNIFIED_TYPES.has(type)) {
        // Use unified send() — handles credential resolution internally
        const result = await send({
          tenantId,
          configLabel: configLabel as string | undefined,
          channel: 'whatsapp',
          to: dest,
          type,
          payload: p,
        } as unknown as SendRequest);
        if (!result.success) {
          res.status(500).json({ ok: false, error: result.error });
          return;
        }
        res.json({ ok: true, result });
      } else {
        // Non-unified types — resolve credentials manually, call library directly
        const config = await resolveCommsCredentials(tenantId, 'whatsapp', configLabel as string | undefined);
        const token = config.credentials.token;
        const phoneId = config.senderIdentity.phone_number_id;

        const result = await handleNonUnifiedType(type, token, phoneId, dest, p, res);
        if (result === null) return; // response already sent by handler
        res.json({ ok: true, result });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      res.status(500).json({ ok: false, error: message });
    }
  })

  // ── POST /api/sample-api/whatsapp/broadcast ─────────────────────────────────
  // Enqueue broadcast message to outbox for async delivery.
  // Body: { recipients: string[], type, configLabel?, ...payload }
  // Example: { recipients: ["+60111", "+60222"], type: "text", text: "Hello everyone!" }
  .post('/broadcast', async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { recipients, type, configLabel, ...payload } = req.body as Record<string, unknown>;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ ok: false, error: 'recipients (array of phone numbers) is required' });
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
        channel: 'whatsapp',
        recipients: recipients as string[],
        type,
        payload,
      });
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  });
