import {
  cancelScheduledEmail,
  sendBulkDynamicEmail,
  sendBulkEmail,
  sendDynamicEmail,
  sendEmail,
  sendEmailWithAttachments,
  sendScheduledEmail,
} from '@common/node/comms/sendgrid/outbound';
import type { SendGridAuth, SgAttachment, SgPersonalization, SgSendEmailOpts } from '@common/node/comms/sendgrid/types';
import { resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid email test dispatcher
// Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
//
// Credentials are resolved per-tenant from the database via resolveCommsCredentials().
// Each tenant must configure their own SendGrid API key and sender identity.

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

async function handleHtml(auth: SendGridAuth, dest: string | string[], p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendEmail(auth, dest, String(p.subject ?? 'Test Email'), String(p.html ?? ''), opts);
}

async function handleDynamic(auth: SendGridAuth, dest: string | string[], p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendDynamicEmail(auth, dest, String(p.templateId ?? ''), (p.data as Record<string, unknown>) ?? {}, opts);
}

async function handleAttachment(auth: SendGridAuth, dest: string | string[], p: Record<string, unknown>) {
  const opts = buildOpts(p);
  // attachments are passed as both the required param and in opts (sendEmailWithAttachments merges them)
  delete opts.attachments;
  return sendEmailWithAttachments(
    auth,
    dest,
    String(p.subject ?? 'Test Email'),
    String(p.html ?? ''),
    (p.attachments as SgAttachment[]) ?? [],
    opts,
  );
}

async function handleBulk(auth: SendGridAuth, p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendBulkEmail(
    auth,
    (p.personalizations as SgPersonalization[]) ?? [],
    String(p.subject ?? 'Bulk Email'),
    String(p.html ?? ''),
    opts,
  );
}

async function handleBulkDynamic(auth: SendGridAuth, p: Record<string, unknown>) {
  const opts = buildOpts(p);
  return sendBulkDynamicEmail(
    auth,
    String(p.templateId ?? ''),
    (p.personalizations as SgPersonalization[]) ?? [],
    opts,
  );
}

async function handleScheduled(auth: SendGridAuth, dest: string | string[], p: Record<string, unknown>, res: Response) {
  const sendAt = Number(p.sendAt);
  if (!sendAt || Number.isNaN(sendAt)) {
    res.status(400).json({ ok: false, error: 'sendAt (unix timestamp) is required for scheduled type' });
    return null;
  }
  const opts = buildOpts(p);
  return sendScheduledEmail(auth, dest, String(p.subject ?? 'Scheduled Email'), String(p.html ?? ''), sendAt, opts);
}

async function handleCancel(auth: SendGridAuth, p: Record<string, unknown>, res: Response) {
  if (!p.batchId) {
    res.status(400).json({ ok: false, error: 'batchId is required for cancel type' });
    return null;
  }
  return cancelScheduledEmail(auth, String(p.batchId ?? ''));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export default express
  .Router()

  // ── POST /api/sample-api/sendgrid/test ────────────────────────────────────────
  // Multi-type test dispatcher.
  // Body: { type, to, ...type-specific fields }
  // Requires authenticated user with tenant_id for credential resolution.
  // See EmailTest.vue for sample payloads per type.
  .post('/test', async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    let auth: SendGridAuth;
    try {
      const config = await resolveCommsCredentials(tenantId, 'email');
      auth = {
        apiKey: config.credentials.api_key,
        senderName: config.senderIdentity.sender_name,
        senderEmail: config.senderIdentity.sender_email,
      };
    } catch (err: unknown) {
      res
        .status(500)
        .json({ ok: false, error: err instanceof Error ? err.message : 'Failed to resolve email credentials' });
      return;
    }

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
          result = await handleHtml(auth, dest, p);
          break;
        case 'dynamic':
          result = await handleDynamic(auth, dest, p);
          break;
        case 'attachment':
          result = await handleAttachment(auth, dest, p);
          break;
        case 'bulk':
          result = await handleBulk(auth, p);
          break;
        case 'bulk-dynamic':
          result = await handleBulkDynamic(auth, p);
          break;
        case 'scheduled':
          result = await handleScheduled(auth, dest, p, res);
          if (result === null) return;
          break;
        case 'cancel':
          result = await handleCancel(auth, p, res);
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
