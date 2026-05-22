import {
  cancelScheduledEmail,
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

export default express
  .Router()

  // ── POST /api/sample-api/email/test ─────────────────────────────────────────
  // Multi-type test dispatcher — no auth.
  // Body: { type, to, ...type-specific fields }
  // See EmailTest.vue for sample payloads per type.
  .post('/test', async (req: Request, res: Response) => {
    const { type, to, ...p } = req.body as Record<string, unknown>;

    if (!type) {
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
          result = await sendEmail(dest, String(p.subject ?? 'Test Email'), String(p.html ?? ''));
          break;

        case 'dynamic': {
          const opts: SgSendEmailOpts = {};
          if (p.cc) opts.cc = p.cc as SgSendEmailOpts['cc'];
          if (p.bcc) opts.bcc = p.bcc as SgSendEmailOpts['bcc'];
          if (p.replyTo) opts.replyTo = p.replyTo as SgSendEmailOpts['replyTo'];
          if (p.attachments) opts.attachments = p.attachments as SgAttachment[];
          if (p.sendAt) opts.sendAt = Number(p.sendAt);
          if (p.categories) opts.categories = p.categories as string[];
          result = await sendDynamicEmail(
            dest,
            String(p.templateId ?? ''),
            (p.data as Record<string, unknown>) ?? {},
            opts,
          );
          break;
        }

        case 'attachment':
          result = await sendEmailWithAttachments(
            dest,
            String(p.subject ?? 'Test Email'),
            String(p.html ?? ''),
            (p.attachments as SgAttachment[]) ?? [],
          );
          break;

        case 'bulk':
          result = await sendBulkEmail(
            (p.personalizations as SgPersonalization[]) ?? [],
            String(p.subject ?? 'Bulk Email'),
            String(p.html ?? ''),
          );
          break;

        case 'scheduled': {
          const sendAt = Number(p.sendAt);
          if (!sendAt || Number.isNaN(sendAt)) {
            res.status(400).json({ ok: false, error: 'sendAt (unix timestamp) is required for scheduled type' });
            return;
          }
          result = await sendScheduledEmail(dest, String(p.subject ?? 'Scheduled Email'), String(p.html ?? ''), sendAt);
          break;
        }

        case 'cancel':
          if (!p.batchId) {
            res.status(400).json({ ok: false, error: 'batchId is required for cancel type' });
            return;
          }
          result = await cancelScheduledEmail(String(p.batchId));
          break;

        default:
          res.status(400).json({ ok: false, error: `unknown type: ${String(type)}` });
          return;
      }

      res.json({ ok: true, result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
