import { cancelScheduledEmail, sendBulkDynamicEmail, sendBulkEmail } from '@common/node/comms/sendgrid/outbound';
import type { SendGridAuth, SgAttachment, SgPersonalization, SgSendEmailOpts } from '@common/node/comms/sendgrid/types';
import { broadcast } from '@common/node/comms/service/broadcast';
import { enqueueBroadcast } from '@common/node/comms/service/outbox';
import { send } from '@common/node/comms/service/send';
import type { SendRequest } from '@common/node/comms/service/types';
import { resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid email test dispatcher
// Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
//
// Credentials are resolved per-tenant from the database via the unified comms service.
// Each tenant must configure their own SendGrid API key and sender identity.

// ─── Types supported by the unified send() ────────────────────────────────────
const UNIFIED_TYPES = new Set(['html', 'dynamic', 'attachment', 'scheduled', 'scheduled_dynamic']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract common send options from the request payload */
function buildOpts(
  p: Record<string, unknown>,
  tenantContext?: { _tenantId: number; _configLabel: string },
): SgSendEmailOpts {
  const opts: SgSendEmailOpts = {};
  if (p.cc) opts.cc = p.cc as SgSendEmailOpts['cc'];
  if (p.bcc) opts.bcc = p.bcc as SgSendEmailOpts['bcc'];
  if (p.replyTo) opts.replyTo = p.replyTo as SgSendEmailOpts['replyTo'];
  if (p.attachments) opts.attachments = p.attachments as SgAttachment[];
  if (p.sendAt) opts.sendAt = Number(p.sendAt);
  if (p.categories) opts.categories = p.categories as string[];
  // Inject tenant context for event webhook correlation
  if (tenantContext) {
    opts._tenantId = tenantContext._tenantId;
    opts._configLabel = tenantContext._configLabel;
  }
  return opts;
}

// ─── Non-unified type handlers (bulk, cancel — different input shapes) ────────

async function handleBulk(
  auth: SendGridAuth,
  p: Record<string, unknown>,
  tenantContext?: { _tenantId: number; _configLabel: string },
) {
  const opts = buildOpts(p, tenantContext);
  return sendBulkEmail(
    auth,
    (p.personalizations as SgPersonalization[]) ?? [],
    String(p.subject ?? 'Bulk Email'),
    String(p.html ?? ''),
    opts,
  );
}

async function handleBulkDynamic(
  auth: SendGridAuth,
  p: Record<string, unknown>,
  tenantContext?: { _tenantId: number; _configLabel: string },
) {
  const opts = buildOpts(p, tenantContext);
  return sendBulkDynamicEmail(
    auth,
    String(p.templateId ?? ''),
    (p.personalizations as SgPersonalization[]) ?? [],
    opts,
  );
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

    if (type !== 'cancel' && type !== 'bulk' && type !== 'bulk-dynamic' && !to) {
      res.status(400).json({ ok: false, error: 'to is required' });
      return;
    }

    try {
      // Map test page type names to unified service type names
      const unifiedType =
        type === 'attachment' ? 'html_attachments' : type === 'scheduled_dynamic' ? 'scheduled_dynamic' : type;

      if (UNIFIED_TYPES.has(type)) {
        // Build opts with tenant context for custom_args injection
        const opts = buildOpts(
          p,
          configLabel ? { _tenantId: tenantId, _configLabel: configLabel as string } : undefined,
        );

        const result = await send({
          tenantId,
          configLabel: configLabel as string | undefined,
          channel: 'email',
          to: to as string,
          type: unifiedType,
          payload: { ...p, opts },
        } as unknown as SendRequest);
        if (!result.success) {
          res.status(500).json({ ok: false, error: result.error });
          return;
        }
        res.json({ ok: true, result });
      } else {
        // Non-unified types — resolve credentials manually
        const config = await resolveCommsCredentials(tenantId, 'email', configLabel as string | undefined);
        const auth: SendGridAuth = {
          apiKey: config.credentials.api_key,
          senderName: config.senderIdentity.sender_name,
          senderEmail: config.senderIdentity.sender_email,
        };
        const tenantContext = { _tenantId: tenantId, _configLabel: config.label };

        let result: unknown;
        switch (type) {
          case 'bulk':
            result = await handleBulk(auth, p, tenantContext);
            break;
          case 'bulk-dynamic':
            result = await handleBulkDynamic(auth, p, tenantContext);
            break;
          case 'cancel':
            result = await handleCancel(auth, p, res);
            if (result === null) return;
            break;
          default:
            res.status(400).json({ ok: false, error: `Unknown type: ${type}` });
            return;
        }

        res.json({ ok: true, result });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      res.status(500).json({ ok: false, error: message });
    }
  })

  // ── POST /api/sample-api/sendgrid/broadcast ─────────────────────────────────
  // Enqueue broadcast email to outbox for async delivery.
  // Body: { recipients: string[], type, configLabel?, subject, html/templateId/dynamicData }
  // Example: { recipients: ["a@b.com", "c@d.com"], type: "html", subject: "Hello", html: "<p>Hi!</p>" }
  .post('/broadcast', async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { recipients, type, configLabel, ...payload } = req.body as Record<string, unknown>;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ ok: false, error: 'recipients (array of email addresses) is required' });
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
        channel: 'email',
        recipients: recipients as string[],
        type: type === 'attachment' ? 'html_attachments' : type,
        payload,
      });
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  });
