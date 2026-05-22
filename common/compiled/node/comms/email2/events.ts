// SendGrid v3 Event Webhook — parser and signature verification (email2)
// Docs: https://docs.sendgrid.com/for-developers/tracking-events/event
//
// SendGrid POSTs a JSON array of events to your webhook URL whenever
// delivery, engagement, or compliance events occur for emails you've sent.
//
// Events include: processed, dropped, delivered, deferred, bounce, open, click,
// spam_report, unsubscribe, group_unsubscribe, group_resubscribe.
//
// Signature verification uses ECDSA with P-256 (secp256r1) curve.
// Headers: X-Twilio-Email-Event-Webhook-Signature, X-Twilio-Email-Event-Webhook-Timestamp

import crypto from 'node:crypto';
import { str } from '@common/iso/str';
import type { SgEvent, SgEventType } from './types.ts';

export type { SgEvent, SgEventType };

/** Extract categories from raw event — can be string, array, or absent */
function parseCategories(raw: Record<string, unknown>): string[] {
  if (Array.isArray(raw.category)) return raw.category.map(v => str(v));
  if (raw.category && typeof raw.category === 'string') return [raw.category];
  return [];
}

/** Extract optional fields from raw event into the typed SgEvent */
function assignOptionalFields(event: SgEvent, raw: Record<string, unknown>): void {
  // Bounce fields
  if (typeof raw.reason === 'string') event.reason = raw.reason;
  if (typeof raw.type === 'string') event.bounceType = raw.type;
  if (typeof raw.status === 'string') event.status = raw.status;

  // Click fields
  if (typeof raw.url === 'string') event.url = raw.url;

  // Open fields
  if (typeof raw.useragent === 'string') event.userAgent = raw.useragent;
  if (raw.sg_machine_open) event.sgMachineOpen = raw.sg_machine_open === true || raw.sg_machine_open === 'true';

  // Drop fields
  if (raw.event === 'dropped' && typeof raw.reason === 'string') event.dropReason = raw.reason;

  // Deferred fields
  if (raw.attempt) event.attempt = Number(raw.attempt);
}

// ─── Event parser ─────────────────────────────────────────────────────────────

/**
 * Parse a SendGrid Event Webhook payload (JSON array) into typed `SgEvent[]`.
 *
 * SendGrid POSTs a JSON array of event objects. This function normalises
 * the raw snake_case fields into a clean camelCase structure.
 *
 * @param body - The parsed JSON body from the webhook POST (should be an array)
 *
 * @example
 * router.post('/events', express.json(), (req, res) => {
 *   res.sendStatus(200);
 *   const events = parseEventWebhook(req.body);
 *   for (const evt of events) {
 *     if (evt.event === 'bounce') {
 *       console.log(`Bounce for ${evt.email}: ${evt.reason}`);
 *     }
 *   }
 * });
 */
export function parseEventWebhook(body: unknown): SgEvent[] {
  if (!Array.isArray(body)) return [];

  return body.map((raw: Record<string, unknown>) => {
    const event: SgEvent = {
      event: str(raw.event, 'unknown') as SgEventType,
      email: str(raw.email),
      timestamp: Number(raw.timestamp ?? 0),
      date: new Date(Number(raw.timestamp ?? 0) * 1000).toISOString(),
      sgMessageId: str(raw.sg_message_id),
      categories: parseCategories(raw),
      customArgs: {},
    };

    // Extract custom_args — SendGrid flattens them into the top-level event object
    // with keys matching what was passed during send. We collect any non-standard keys.
    const knownKeys = new Set([
      'event',
      'email',
      'timestamp',
      'sg_message_id',
      'sg_event_id',
      'category',
      'reason',
      'type',
      'status',
      'url',
      'useragent',
      'sg_machine_open',
      'attempt',
      'ip',
      'tls',
      'cert_err',
      'marketing_campaign_id',
      'marketing_campaign_name',
      'asm_group_id',
      'newsletter',
    ]);
    for (const [key, val] of Object.entries(raw)) {
      if (!knownKeys.has(key) && typeof val === 'string') {
        event.customArgs[key] = val;
      }
    }

    assignOptionalFields(event, raw);
    return event;
  });
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify the ECDSA signature of a SendGrid Event Webhook payload.
 *
 * SendGrid signs event webhook POSTs using ECDSA with the P-256 curve.
 * The signature is in the `X-Twilio-Email-Event-Webhook-Signature` header (base64),
 * and the timestamp is in `X-Twilio-Email-Event-Webhook-Timestamp` header.
 *
 * The signed payload is: timestamp + raw body (concatenated, no separator).
 *
 * @param publicKey - The ECDSA public key from SendGrid dashboard (PEM or base64 DER)
 * @param rawBody - The raw request body as a string or Buffer
 * @param signature - The base64-encoded signature from the header
 * @param timestamp - The timestamp string from the header
 * @returns true if the signature is valid, false otherwise
 *
 * @example
 * const isValid = verifyEventWebhookSignature(
 *   process.env.SENDGRID_EVENT_WEBHOOK_KEY,
 *   req.rawBody,
 *   req.headers['x-twilio-email-event-webhook-signature'],
 *   req.headers['x-twilio-email-event-webhook-timestamp'],
 * );
 * if (!isValid) return res.sendStatus(403);
 */
export function verifyEventWebhookSignature(
  publicKey: string,
  rawBody: string | Buffer,
  signature: string,
  timestamp: string,
): boolean {
  if (!publicKey || !signature || !timestamp) return false;

  try {
    // Build the signed payload: timestamp + body (concatenated)
    const payload =
      typeof rawBody === 'string' ? timestamp + rawBody : Buffer.concat([Buffer.from(timestamp), rawBody]);

    // The public key from SendGrid is base64-encoded DER (SubjectPublicKeyInfo).
    // Wrap it in PEM format if it doesn't already have PEM headers.
    let pemKey = publicKey.trim();
    if (!pemKey.startsWith('-----BEGIN')) {
      pemKey = `-----BEGIN PUBLIC KEY-----\n${pemKey}\n-----END PUBLIC KEY-----`;
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(payload);
    return verifier.verify(pemKey, signature, 'base64');
  } catch {
    return false;
  }
}
