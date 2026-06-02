// WhatsApp Cloud API — inbound webhook parser (v2)
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/payload-examples
//
// Meta's webhook payload is deeply nested and varies by event type.
// This module normalises it into clean, typed structures.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WaDeliveryStatus, WaInboundContent, WaParsedMessage, WaParsedWebhook } from './types.ts';

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Normalise the raw Meta webhook body into a typed `WaParsedWebhook`.
 *
 * Meta can bundle multiple events in one POST. This function extracts
 * both inbound messages and delivery/read status updates.
 *
 * @example
 * // In your Express webhook handler:
 * router.post('/webhook', async (req, res) => {
 *   res.sendStatus(200); // ack immediately
 *   const parsed = parseWebhook(req.body);
 *   for (const msg of parsed.messages) {
 *     if (msg.content.type === 'text') {
 *       console.log(`${msg.name ?? msg.from}: ${msg.content.body}`);
 *     }
 *   }
 * });
 */
export function parseWebhook(body: unknown): WaParsedWebhook {
  const raw = body as Record<string, unknown>;
  const entry = (raw?.entry as Record<string, unknown>[] | undefined) ?? [];
  const value = (entry[0]?.changes as Record<string, unknown>[] | undefined)?.[0]?.value as
    | Record<string, unknown>
    | undefined;

  const businessAccountId = String(entry[0]?.id ?? '');
  const phoneNumberId = String((value?.metadata as Record<string, unknown>)?.phone_number_id ?? '');

  // Build sender-name lookup from the contacts array Meta includes alongside messages
  const nameMap = new Map<string, string>();
  const contactsArr = (value?.contacts as Record<string, unknown>[] | undefined) ?? [];
  for (const c of contactsArr) {
    const wa_id = String(c?.wa_id ?? '');
    const name = String((c?.profile as Record<string, unknown>)?.name ?? '');
    if (wa_id) nameMap.set(wa_id, name);
  }

  // Parse inbound messages
  const rawMessages = (value?.messages as Record<string, unknown>[] | undefined) ?? [];
  const messages: WaParsedMessage[] = rawMessages.map(msg => parseMessage(msg, phoneNumberId, nameMap));

  // Parse delivery/read status updates
  const rawStatuses = (value?.statuses as Record<string, unknown>[] | undefined) ?? [];
  const statuses: WaDeliveryStatus[] = rawStatuses.map(s => ({
    messageId: String(s?.id ?? ''),
    status: String(s?.status ?? 'unknown') as WaDeliveryStatus['status'],
    timestamp: new Date(Number(s?.timestamp ?? 0) * 1000).toISOString(),
    recipientId: String(s?.recipient_id ?? ''),
  }));

  return { businessAccountId, phoneNumberId, messages, statuses };
}

// ─── Message parser ───────────────────────────────────────────────────────────

function parseMessage(
  msg: Record<string, unknown>,
  phoneNumberId: string,
  nameMap: Map<string, string>,
): WaParsedMessage {
  const type = String(msg?.type ?? 'unknown');
  const from = String(msg?.from ?? '');
  const context = msg?.context as Record<string, unknown> | undefined;

  return {
    messageId: String(msg?.id ?? ''),
    from,
    phoneNumberId,
    timestamp: new Date(Number(msg?.timestamp ?? 0) * 1000).toISOString(),
    content: parseContent(type, msg),
    name: nameMap.get(from),
    replyTo: context?.id ? String(context.id) : undefined,
  };
}

function parseContent(type: string, msg: Record<string, unknown>): WaInboundContent {
  switch (type) {
    case 'text':
      return {
        type: 'text',
        body: String((msg?.text as Record<string, unknown>)?.body ?? ''),
      };

    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker': {
      const m = (msg?.[type] as Record<string, unknown>) ?? {};
      return {
        type: type as 'image' | 'audio' | 'video' | 'document' | 'sticker',
        id: String(m?.id ?? ''),
        mime_type: m?.mime_type ? String(m.mime_type) : undefined,
        sha256: m?.sha256 ? String(m.sha256) : undefined,
        caption: m?.caption ? String(m.caption) : undefined,
        filename: m?.filename ? String(m.filename) : undefined,
      };
    }

    case 'location': {
      const l = (msg?.location as Record<string, unknown>) ?? {};
      return {
        type: 'location',
        latitude: Number(l?.latitude ?? 0),
        longitude: Number(l?.longitude ?? 0),
        name: l?.name ? String(l.name) : undefined,
        address: l?.address ? String(l.address) : undefined,
      };
    }

    case 'reaction': {
      const r = (msg?.reaction as Record<string, unknown>) ?? {};
      return {
        type: 'reaction',
        message_id: String(r?.message_id ?? ''),
        emoji: String(r?.emoji ?? ''),
      };
    }

    case 'contacts':
      return {
        type: 'contacts',
        contacts: (msg?.contacts as unknown[]) ?? [],
      };

    // Interactive: user tapped a reply button
    case 'interactive': {
      const inter = (msg?.interactive as Record<string, unknown>) ?? {};
      const interType = String(inter?.type ?? '');

      if (interType === 'button_reply') {
        const br = (inter?.button_reply as Record<string, unknown>) ?? {};
        return {
          type: 'interactive',
          interactive_type: 'button_reply',
          id: String(br?.id ?? ''),
          title: String(br?.title ?? ''),
        };
      }

      if (interType === 'list_reply') {
        const lr = (inter?.list_reply as Record<string, unknown>) ?? {};
        return {
          type: 'interactive',
          interactive_type: 'list_reply',
          id: String(lr?.id ?? ''),
          title: String(lr?.title ?? ''),
          description: lr?.description ? String(lr.description) : undefined,
        };
      }

      return { type: 'interactive' };
    }

    // Legacy button (from template quick-reply buttons)
    case 'button': {
      const b = (msg?.button as Record<string, unknown>) ?? {};
      return {
        type: 'button',
        payload: String(b?.payload ?? ''),
        text: String(b?.text ?? ''),
      };
    }

    default:
      return { type };
  }
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature of an incoming Meta webhook POST.
 *
 * Meta signs every webhook POST with `X-Hub-Signature-256: sha256=<hex>`.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param appSecret - The Meta App Secret from the tenant's credentials
 * @param rawBody - The raw request body buffer (before JSON parsing)
 * @param signatureHeader - The value of the `X-Hub-Signature-256` header
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(appSecret: string, rawBody: Buffer, signatureHeader: string): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}
