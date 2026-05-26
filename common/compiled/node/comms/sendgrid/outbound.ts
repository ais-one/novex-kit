// SendGrid v3 Mail Send API — outbound helpers
// Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
//
// All functions accept a SendGridAuth object as the first parameter.
// The caller is responsible for providing credentials (e.g. from tenant config resolver).
//
// Optional env vars:
//   SENDGRID_URL   — override the SendGrid API endpoint (defaults to global endpoint)
//   SENDGRID_DEBUG — set to 'true' to log every request and response body

import crypto from 'node:crypto';
import type { SendEmailOpts, SendGridAuth, SgAttachment, SgPersonalization, SgSendEmailOpts } from './types.ts';

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

async function sgMailSend(apiKey: string, body: Record<string, unknown>) {
  const url = process.env.SENDGRID_URL ?? BASE_URL;
  sgLog('→', `POST ${url}`, body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

  // Auto-inject tenant context into custom_args for event webhook correlation.
  // These are returned in event webhook payloads so we can route events back to the correct config.
  if (opts._tenantId || opts._configLabel) {
    const existing = (body.custom_args as Record<string, string>) ?? {};
    if (opts._tenantId) existing._novex_tenant_id = String(opts._tenantId);
    if (opts._configLabel) existing._novex_config_label = opts._configLabel;
    body.custom_args = existing;
  }
}

function toAddresses(to: string | string[]) {
  return (Array.isArray(to) ? to : [to]).map(e => ({ email: e }));
}

// ─── Outbound functions ───────────────────────────────────────────────────────

/**
 * Send an HTML email.
 * Supports CC/BCC, reply-to, plain text fallback, attachments, categories, tracking, and scheduling.
 *
 * @example
 * await sendEmail(auth, 'user@example.com', 'Hello', '<p>World</p>');
 * await sendEmail(auth, ['a@x.com', 'b@x.com'], 'Hi', '<p>Hi</p>', { cc: [{ email: 'mgr@x.com' }] });
 */
export async function sendEmail(
  auth: SendGridAuth,
  to: string | string[],
  subject: string,
  htmlContent: string,
  opts: SgSendEmailOpts = {},
) {
  const personalization: SgPersonalization = { to: toAddresses(to) };
  if (opts.cc?.length) personalization.cc = opts.cc;
  if (opts.bcc?.length) personalization.bcc = opts.bcc;

  const body: Record<string, unknown> = {
    personalizations: [personalization],
    from: { name: auth.senderName, email: auth.senderEmail },
    subject,
    content: [
      ...(opts.plainContent ? [{ type: 'text/plain', value: opts.plainContent }] : []),
      { type: 'text/html', value: htmlContent },
    ],
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };

  if (opts.attachments?.length) body.attachments = opts.attachments;
  applyOpts(body, opts);
  return sgMailSend(auth.apiKey, body);
}

/**
 * Send an email using a stored SendGrid dynamic template (Handlebars).
 * templateId is an explicit parameter so different templates can be used per call.
 *
 * @example
 * await sendDynamicEmail(auth, 'user@example.com', 'd-xxxx', { firstName: 'Alice', resetLink: 'https://...' });
 */
export async function sendDynamicEmail(
  auth: SendGridAuth,
  to: string | string[],
  templateId: string,
  dynamicData: Record<string, unknown>,
  opts: SgSendEmailOpts = {},
) {
  const personalization: SgPersonalization = {
    to: toAddresses(to),
    dynamic_template_data: dynamicData,
  };
  if (opts.cc?.length) personalization.cc = opts.cc;
  if (opts.bcc?.length) personalization.bcc = opts.bcc;

  const body: Record<string, unknown> = {
    personalizations: [personalization],
    from: { name: auth.senderName, email: auth.senderEmail },
    template_id: templateId,
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };
  if (opts.attachments?.length) body.attachments = opts.attachments;
  applyOpts(body, opts);
  return sgMailSend(auth.apiKey, body);
}

/**
 * Send an HTML email with one or more file attachments.
 * Each attachment's content must be a base64-encoded string.
 *
 * @example
 * import { readFileSync } from 'node:fs';
 * const content = readFileSync('./invoice.pdf').toString('base64');
 * await sendEmailWithAttachments(auth, 'user@example.com', 'Invoice', '<p>See attached.</p>', [
 *   { content, filename: 'invoice.pdf', type: 'application/pdf' },
 * ]);
 */
export async function sendEmailWithAttachments(
  auth: SendGridAuth,
  to: string | string[],
  subject: string,
  htmlContent: string,
  attachments: SgAttachment[],
  opts: SendEmailOpts = {},
) {
  return sendEmail(auth, to, subject, htmlContent, { ...opts, attachments });
}

/**
 * Send to multiple recipients in a single API call (up to 1000 personalizations).
 * Each personalization can override subject, add CC/BCC, or set per-recipient dynamic template data.
 *
 * @example
 * await sendBulkEmail(auth,
 *   [
 *     { to: [{ email: 'alice@example.com' }], dynamic_template_data: { name: 'Alice' } },
 *     { to: [{ email: 'bob@example.com' }], dynamic_template_data: { name: 'Bob' } },
 *   ],
 *   'Monthly Newsletter',
 *   '<p>Hello {{name}}</p>',
 * );
 */
export async function sendBulkEmail(
  auth: SendGridAuth,
  personalizations: SgPersonalization[],
  subject: string,
  htmlContent: string,
  opts: SgSendEmailOpts = {},
) {
  const body: Record<string, unknown> = {
    personalizations,
    from: { name: auth.senderName, email: auth.senderEmail },
    subject,
    content: [
      ...(opts.plainContent ? [{ type: 'text/plain', value: opts.plainContent }] : []),
      { type: 'text/html', value: htmlContent },
    ],
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };
  if (opts.attachments?.length) body.attachments = opts.attachments;
  applyOpts(body, opts);
  return sgMailSend(auth.apiKey, body);
}

/**
 * Send a dynamic template to multiple recipients in a single API call (up to 1000 personalizations).
 * Each personalization can have its own dynamic_template_data, CC/BCC, and subject override.
 *
 * @example
 * await sendBulkDynamicEmail(auth, 'd-xxxx', [
 *   { to: [{ email: 'alice@example.com' }], dynamic_template_data: { name: 'Alice' } },
 *   { to: [{ email: 'bob@example.com' }], dynamic_template_data: { name: 'Bob' } },
 * ]);
 */
export async function sendBulkDynamicEmail(
  auth: SendGridAuth,
  templateId: string,
  personalizations: SgPersonalization[],
  opts: SendEmailOpts = {},
) {
  const body: Record<string, unknown> = {
    personalizations,
    from: { name: auth.senderName, email: auth.senderEmail },
    template_id: templateId,
    headers: { 'X-Entity-Ref-ID': randomHash(), ...opts.headers },
  };
  applyOpts(body, opts);
  return sgMailSend(auth.apiKey, body);
}

/**
 * Schedule an email for future delivery (max 72 hours from now).
 * Returns the batchId which can be passed to `cancelScheduledEmail` to cancel before delivery.
 *
 * @param sendAt Unix timestamp in seconds. Must be ≤ 72 hours in the future.
 *
 * @example
 * const inOneHour = Math.floor(Date.now() / 1000) + 3600;
 * const { batchId } = await sendScheduledEmail(auth, 'user@example.com', 'Reminder', '<p>Hi</p>', inOneHour);
 */
export async function sendScheduledEmail(
  auth: SendGridAuth,
  to: string | string[],
  subject: string,
  htmlContent: string,
  sendAt: number,
  opts: SgSendEmailOpts = {},
) {
  const batchId = opts.batchId ?? (await generateBatchId(auth));
  await sendEmail(auth, to, subject, htmlContent, { ...opts, sendAt, batchId });
  return { batchId };
}

/**
 * Schedule a dynamic template email for future delivery (max 72 hours from now).
 * Returns the batchId which can be passed to `cancelScheduledEmail` to cancel before delivery.
 *
 * @param sendAt Unix timestamp in seconds. Must be ≤ 72 hours in the future.
 *
 * @example
 * const inOneHour = Math.floor(Date.now() / 1000) + 3600;
 * const { batchId } = await sendScheduledDynamicEmail(auth, 'user@example.com', 'd-xxxx', { name: 'Alice' }, inOneHour);
 * // Later: await cancelScheduledEmail(auth, batchId);
 */
export async function sendScheduledDynamicEmail(
  auth: SendGridAuth,
  to: string | string[],
  templateId: string,
  dynamicData: Record<string, unknown>,
  sendAt: number,
  opts: SgSendEmailOpts = {},
) {
  const batchId = opts.batchId ?? (await generateBatchId(auth));
  await sendDynamicEmail(auth, to, templateId, dynamicData, { ...opts, sendAt, batchId });
  return { batchId };
}

/**
 * Cancel all pending sends in a batch (created via `sendScheduledEmail` or `sendScheduledDynamicEmail`).
 * Only works before the scheduled send_at time arrives.
 *
 * @example
 * await cancelScheduledEmail(auth, batchId);
 */
export async function cancelScheduledEmail(auth: SendGridAuth, batchId: string) {
  const url = 'https://api.sendgrid.com/v3/user/scheduled_sends';
  const payload = { batch_id: batchId, status: 'cancel' };
  sgLog('→', `POST ${url}`, payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.apiKey}`, 'Content-Type': 'application/json' },
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

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Generate a SendGrid batch ID for use with scheduled sends.
 * Pass the returned ID as `opts.batchId` to any send function along with `opts.sendAt`,
 * then use `cancelScheduledEmail(auth, batchId)` to cancel before delivery.
 *
 * @example
 * const batchId = await generateBatchId(auth);
 * await sendDynamicEmail(auth, to, templateId, data, { sendAt: inOneHour, batchId });
 * // Later: await cancelScheduledEmail(auth, batchId);
 */
export async function generateBatchId(auth: SendGridAuth): Promise<string> {
  const url = 'https://api.sendgrid.com/v3/mail/batch';
  sgLog('→', `POST ${url}`, {});

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.apiKey}`, 'Content-Type': 'application/json' },
  });

  const data = (await res.json()) as { batch_id?: string };
  sgLog('←', `${res.status}`, data);
  if (!data.batch_id) throw new SendGridError('Failed to generate batch ID', res.status);
  return data.batch_id;
}
