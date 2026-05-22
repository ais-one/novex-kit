import { str } from '@common/iso/str';
import {
  cancelScheduledEmail,
  sendBulkDynamicEmail,
  sendBulkEmail,
  sendDynamicEmail,
  sendEmail,
  sendEmailWithAttachments,
  sendScheduledEmail,
} from '@common/node/comms/email2/outbound';
import type { SgAttachment, SgPersonalization, SgSendEmailOpts } from '@common/node/comms/email2/types';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid email test dispatcher
// Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
//
// Required env vars (set in .env.local):
//   SENDGRID_KEY          — API key from SendGrid Dashboard → Settings → API Keys
//   SENDGRID_SENDER_NAME  — display name in From field
//   SENDGRID_SENDER_EMAIL — verified sender email address

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract common send options from the request payload */
function buildOpts(p: Record<string, unknown>): SgSendEmailOpts {
  const opts: SgSendEmailOpts = {};
  if (p.cc) opts.cc = p.cc as SgSendEmailOpts['cc'];
  if (p.bcc) opts.bcc = p.bcc as SgSendEmailOpts['bcc'];
  if (p.replyTo) opts.replyTo = p.replyTo as SgSendEmailOpts['replyTo'];
  if (p.attachments) opts.attachments = p.attachments as SgAttachment[];
  if (p.sendAt) opts.sendAt = Number(p.sendAt);
  if (p.categories) opts.categories = p.categories as string[];
  return opts;
}

// ─── Type handlers ────────────────────────────────────────────────────────────

async function handleHtml(dest: string | string[], p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendEmail(dest, str(p.subject, 'Test Email'), str(p.html), opts);
}

async function handleDynamic(dest: string | string[], p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendDynamicEmail(dest, str(p.templateId), (p.data as Record<string, unknown>) ?? {}, opts);
}

async function handleAttachment(dest: string | string[], p: Record<string, unknown>) {
  const opts = buildOpts(p);
  // attachments are passed as both the required param and in opts (sendEmailWithAttachments merges them)
  delete opts.attachments;
  return sendEmailWithAttachments(
    dest,
    str(p.subject, 'Test Email'),
    str(p.html),
    (p.attachments as SgAttachment[]) ?? [],
    opts,
  );
}

async function handleBulk(p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendBulkEmail(
    (p.personalizations as SgPersonalization[]) ?? [],
    str(p.subject, 'Bulk Email'),
    str(p.html),
    opts,
  );
}

async function handleBulkDynamic(p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendBulkDynamicEmail(str(p.templateId), (p.personalizations as SgPersonalization[]) ?? [], opts);
}

async function handleScheduled(dest: string | string[], p: Record<string, unknown>, res: Response) {
  const sendAt = Number(p.sendAt);
  if (!sendAt || Number.isNaN(sendAt)) {
    res.status(400).json({ ok: false, error: 'sendAt (unix timestamp) is required for scheduled type' });
    return null;
  }
  const opts = buildOpts(p);
  return sendScheduledEmail(dest, str(p.subject, 'Scheduled Email'), str(p.html), sendAt, opts);
}

async function handleCancel(p: Record<string, unknown>, res: Response) {
  if (!p.batchId) {
    res.status(400).json({ ok: false, error: 'batchId is required for cancel type' });
    return null;
  }
  return cancelScheduledEmail(str(p.batchId));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export default express
  .Router()

  // ── POST /api/sample-api/email/test ─────────────────────────────────────────
  // Multi-type test dispatcher — no auth.
  // Body: { type, to, ...type-specific fields }
  // See EmailTest.vue for sample payloads per type.
  .post('/test', async (req: Request, res: Response) => {
    const { type, to, ...p } = req.body as Record<string, unknown>;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ ok: false, error: 'type is required' });
      return;
    }

    if (type !== 'cancel' && !to) {
      res.status(400).json({ ok: false, error: 'to is required' });
      return;
    }

    try {
      let result: unknown;
      const dest = to as string | string[];

      switch (type) {
        case 'html':
          result = await handleHtml(dest, p);
          break;
        case 'dynamic':
          result = await handleDynamic(dest, p);
          break;
        case 'attachment':
          result = await handleAttachment(dest, p);
          break;
        case 'bulk':
          result = await handleBulk(p);
          break;
        case 'bulk-dynamic':
          result = await handleBulkDynamic(p);
          break;
        case 'scheduled':
          result = await handleScheduled(dest, p, res);
          if (result === null) return;
          break;
        case 'cancel':
          result = await handleCancel(p, res);
          if (result === null) return;
          break;
        default:
          res.status(400).json({ ok: false, error: `unknown type: ${type}` });
          return;
      }

      res.json({ ok: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      res.status(500).json({ ok: false, error: message });
    }
  });
