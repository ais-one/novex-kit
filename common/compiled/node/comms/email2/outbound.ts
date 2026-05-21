// SendGrid v3 Mail Send API — outbound helpers (email2)
// Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
//
// All functions read credentials from env at call time:
//   SENDGRID_KEY          — required for all operations
//   SENDGRID_SENDER_NAME  — display name in From field
//   SENDGRID_SENDER_EMAIL — From email address (must be a verified sender)
//   SENDGRID_URL          — optional override (defaults to SendGrid global endpoint)
//   SENDGRID_DEBUG        — set to 'true' to log every request and response body

import crypto from 'node:crypto';
import type { SendEmailOpts, SgAttachment, SgPersonalization, SgSendEmailOpts } from './types.ts';

const BASE_URL = 'https://api.sendgrid.com/v3/mail/send';

const DEBUG = process.env.SENDGRID_DEBUG === '1' || process.env.SENDGRID_DEBUG === 'true';
function sgLog(direction: '→' | '←', label: string, data: unknown) {
  if (DEBUG) logger.debug(`[SG ${direction}] ${label}`, { payload: data });
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class SendGridError extends Error {
  status: number;
  errors: unknown[];
  constructor(message: string, status: number, errors: unknown[] = []) {
    super(`[SendGrid] HTTP ${status}: ${message}`);
    this.status = status;
    this.errors = errors;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function randomHash() {
  return crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 15);
}

function getApiKey(): string {
  const key = process.env.SENDGRID_KEY;
  if (!key) throw new Error('SENDGRID_KEY is not defined');
  return key;
}

function getCredentials() {
  const key = getApiKey();
  const { SENDGRID_SENDER_NAME: senderName, SENDGRID_SENDER_EMAIL: senderEmail } = process.env;
  if (!senderName) throw new Error('SENDGRID_SENDER_NAME is not defined');
  if (!senderEmail) throw new Error('SENDGRID_SENDER_EMAIL is not defined');
  return { key, senderName, senderEmail };
}

async function sgMailSend(body: Record<string, unknown>) {
  const key = getApiKey();
  const url = process.env.SENDGRID_URL ?? BASE_URL;
  sgLog('→', `POST ${url}`, body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // 202 Accepted is the normal SendGrid success response for mail/send
  if (res.status === 202) {
    sgLog('←', `${res.status}`, 'accepted');
    return { status: res.status };
  }

  const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message: string }> };
  sgLog('←', `${res.status}`, data);
  throw new SendGridError(data.errors?.[0]?.message ?? `HTTP ${res.status}`, res.status, data.errors ?? []);
}

function applyOpts(body: Record<string, unknown>, opts: SendEmailOpts) {
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.categories?.length) body.categories = opts.categories;
  if (opts.customArgs) body.custom_args = opts.customArgs;
  if (opts.trackingSettings) body.tracking_settings = opts.trackingSettings;
  if (opts.mailSettings) body.mail_settings = opts.mailSettings;
  if (opts.sendAt) body.send_at = opts.sendAt;
  if (opts.batchId) body.batch_id = opts.batchId;
  if (opts.asmGroupId) body.asm = { group_id: opts.asmGroupId };
}

function toAddresses(to: string | string[]) {
  return (Array.isArray(to) ? to : [to]).map(e => ({ email: e }));
}

// ─── Outbound functions ───────────────────────────────────────────────────────

/**
 * Send an HTML email. Upgraded replacement for the v1 `sendEmail` helper.
 * Supports CC/BCC, reply-to, plain text fallback, attachments, categories, tracking, and scheduling.
 *
 * @example
 * await sendEmail('user@example.com', 'Hello', '<p>World</p>');
 * await sendEmail(['a@x.com', 'b@x.com'], 'Hi', '<p>Hi</p>', { cc: [{ email: 'mgr@x.com' }] });
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  opts: SgSendEmailOpts = {},
) {
  const { senderName, senderEmail } = getCredentials();
  const personalization: SgPersonalization = { to: toAddresses(to) };
  if (opts.cc?.length) personalization.cc = opts.cc;
  if (opts.bcc?.length) personalization.bcc = opts.bcc;

  const body: Record<string, unknown> = {
    personalizations: [personalization],
    from: { name: senderName, email: senderEmail },
    subject,
    content: [
      ...(opts.plainContent ? [{ type: 'text/plain', value: opts.plainContent }] : []),
      { type: 'text/html', value: htmlContent },
    ],
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };

  if (opts.attachments?.length) body.attachments = opts.attachments;
  applyOpts(body, opts);
  return sgMailSend(body);
}

/**
 * Send an email using a stored SendGrid dynamic template (Handlebars).
 * Upgraded replacement for the v1 `sendDynamicEmail` — templateId is an explicit parameter,
 * not hardcoded from env, so different templates can be used per call.
 *
 * @example
 * await sendDynamicEmail('user@example.com', 'd-xxxx', { firstName: 'Alice', resetLink: 'https://...' });
 */
export async function sendDynamicEmail(
  to: string | string[],
  templateId: string,
  dynamicData: Record<string, unknown>,
  opts: SendEmailOpts = {},
) {
  const { senderName, senderEmail } = getCredentials();
  const personalization: SgPersonalization = {
    to: toAddresses(to),
    dynamic_template_data: dynamicData,
  };
  if (opts.cc?.length) personalization.cc = opts.cc;
  if (opts.bcc?.length) personalization.bcc = opts.bcc;

  const body: Record<string, unknown> = {
    personalizations: [personalization],
    from: { name: senderName, email: senderEmail },
    template_id: templateId,
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };
  applyOpts(body, opts);
  return sgMailSend(body);
}

/**
 * Send an HTML email with one or more file attachments.
 * Each attachment's content must be a base64-encoded string.
 *
 * @example
 * import { readFileSync } from 'node:fs';
 * const content = readFileSync('./invoice.pdf').toString('base64');
 * await sendEmailWithAttachments('user@example.com', 'Invoice', '<p>See attached.</p>', [
 *   { content, filename: 'invoice.pdf', type: 'application/pdf' },
 * ]);
 */
export async function sendEmailWithAttachments(
  to: string | string[],
  subject: string,
  htmlContent: string,
  attachments: SgAttachment[],
  opts: SendEmailOpts = {},
) {
  return sendEmail(to, subject, htmlContent, { ...opts, attachments });
}

/**
 * Send to multiple recipients in a single API call (up to 1000 personalizations).
 * Each personalization can override subject, add CC/BCC, or set per-recipient dynamic template data.
 *
 * @example
 * await sendBulkEmail(
 *   [
 *     { to: [{ email: 'alice@example.com' }], dynamic_template_data: { name: 'Alice' } },
 *     { to: [{ email: 'bob@example.com' }], dynamic_template_data: { name: 'Bob' } },
 *   ],
 *   'Monthly Newsletter',
 *   '<p>Hello {{name}}</p>',
 * );
 */
export async function sendBulkEmail(
  personalizations: SgPersonalization[],
  subject: string,
  htmlContent: string,
  opts: SgSendEmailOpts = {},
) {
  const { senderName, senderEmail } = getCredentials();
  const body: Record<string, unknown> = {
    personalizations,
    from: { name: senderName, email: senderEmail },
    subject,
    content: [
      ...(opts.plainContent ? [{ type: 'text/plain', value: opts.plainContent }] : []),
      { type: 'text/html', value: htmlContent },
    ],
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };
  if (opts.attachments?.length) body.attachments = opts.attachments;
  applyOpts(body, opts);
  return sgMailSend(body);
}

/**
 * Schedule an email for future delivery (max 72 hours from now).
 * Returns the batchId which can be passed to `cancelScheduledEmail` to cancel before delivery.
 *
 * @param sendAt Unix timestamp in seconds. Must be ≤ 72 hours in the future.
 *
 * @example
 * const inOneHour = Math.floor(Date.now() / 1000) + 3600;
 * const { batchId } = await sendScheduledEmail('user@example.com', 'Reminder', '<p>Hi</p>', inOneHour);
 */
export async function sendScheduledEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  sendAt: number,
  opts: SgSendEmailOpts = {},
) {
  const batchId = opts.batchId ?? (await generateBatchId());
  await sendEmail(to, subject, htmlContent, { ...opts, sendAt, batchId });
  return { batchId };
}

/**
 * Cancel all pending sends in a batch (created via `sendScheduledEmail`).
 * Only works before the scheduled send_at time arrives.
 *
 * @example
 * await cancelScheduledEmail(batchId);
 */
export async function cancelScheduledEmail(batchId: string) {
  const key = getApiKey();
  const url = 'https://api.sendgrid.com/v3/user/scheduled_sends';
  const payload = { batch_id: batchId, status: 'cancel' };
  sgLog('→', `POST ${url}`, payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    sgLog('←', `${res.status}`, 'cancelled');
    return { ok: true };
  }

  const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message: string }> };
  sgLog('←', `${res.status}`, data);
  throw new SendGridError(data.errors?.[0]?.message ?? `HTTP ${res.status}`, res.status, data.errors ?? []);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function generateBatchId(): Promise<string> {
  const key = getApiKey();
  const url = 'https://api.sendgrid.com/v3/mail/batch';
  sgLog('→', `POST ${url}`, {});

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });

  const data = (await res.json()) as { batch_id?: string };
  sgLog('←', `${res.status}`, data);
  if (!data.batch_id) throw new SendGridError('Failed to generate batch ID', res.status);
  return data.batch_id;
}
