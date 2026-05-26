import { parseEventWebhook, verifyEventWebhookSignature } from '@common/node/comms/sendgrid/events';
import { parseInboundEmail } from '@common/node/comms/sendgrid/inbound';
import { resolveCommsConfigByIdentity, resolveCommsConfigByLabel } from '@common/node/comms/tenant/resolver';
import { memoryUpload } from '@common/node/express/upload';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid Inbound Parse + Event Webhook routes
// Docs:
//   Inbound Parse: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
//   Event Webhook: https://docs.sendgrid.com/for-developers/tracking-events/event
//
// Multi-config architecture:
//   - Inbound Parse: routes by matching envelope.to address to config's sender_email (reverse lookup)
//   - Event Webhook: path-based routing (/events/:label) for signature verification + custom_args fallback
//   - Falls back to env vars (SENDGRID_EVENT_WEBHOOK_KEY) for backward compat

const upload = memoryUpload({ limits: { fileSize: 30 * 1024 * 1024, files: 20 } });

export default express
  .Router()

  // ── POST /api/sample-api/sendgrid/inbound ─────────────────────────────────────
  // SendGrid Inbound Parse webhook — receives emails sent to your parse domain.
  // Multi-config: resolves config by matching the recipient (to) address to sender_email.
  //
  // Setup: SendGrid Dashboard > Settings > Inbound Parse > Add Host & URL
  //   Hostname: parse.yourdomain.com (needs MX record pointing to mx.sendgrid.net)
  //   URL: https://your-domain/api/sample-api/sendgrid/inbound
  //
  // For dev/testing: POST a mock multipart/form-data payload directly (no MX record needed).
  .post('/inbound', upload.any(), async (req: Request, res: Response) => {
    // Always respond 200 immediately — SendGrid retries on non-2xx
    res.sendStatus(200);

    try {
      const files = (
        req as unknown as {
          files?: Array<{
            fieldname?: string;
            originalname?: string;
            mimetype?: string;
            buffer?: Buffer;
            size?: number;
          }>;
        }
      ).files;
      const email = parseInboundEmail(req.body, files);

      // Resolve config by recipient email address (envelope.to[0] → sender_email in config)
      const recipientEmail = email.envelope.to[0] ?? '';
      const config = await resolveCommsConfigByIdentity('email', 'sender_email', recipientEmail);

      if (config) {
        logger.info('[Email Inbound] Received (multi-config)', {
          tenant: config.tenantId,
          configLabel: config.label,
          from: email.from,
          to: email.to,
          subject: email.subject,
          attachments: email.attachmentCount,
          spf: email.spf,
        });

        // ── Process in tenant context ─────────────────────────────────────────
        // Replace with your own logic: ticket creation, AI agent, auto-reply, etc.
        // config.tenantId — the tenant this email belongs to
        // config.label — the specific email config (e.g., "support-email")
        // config.credentials.api_key — can be used to send a reply
      } else {
        // No config found — log as unrouted
        logger.info('[Email Inbound] Received (no config match)', {
          from: email.from,
          to: email.to,
          recipientEmail,
          subject: email.subject,
          attachments: email.attachmentCount,
          spf: email.spf,
        });
      }
    } catch (err: unknown) {
      logger.error('[Email Inbound] Parse failed', { error: err instanceof Error ? err.message : String(err) });
    }
  })

  // ── POST /api/sample-api/sendgrid/events/:label ───────────────────────────────
  // SendGrid Event Webhook — per-config endpoint with ECDSA signature verification.
  // Each config gets its own event webhook URL registered in SendGrid Dashboard.
  //
  // Setup: SendGrid Dashboard > Settings > Mail Settings > Event Webhook
  //   HTTP Post URL: https://your-domain/api/sample-api/sendgrid/events/<config-label>
  //   Signed Event Webhook: ON (provides ECDSA signature verification)
  .post(
    '/events/:label',
    express.json({
      limit: '5mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
    async (req: Request, res: Response) => {
      const { label } = req.params;

      // Resolve config by label
      const config = await resolveCommsConfigByLabel('email', label);
      if (!config) {
        res.sendStatus(404);
        return;
      }

      // Signature verification using config's event_webhook_public_key
      const publicKey = config.credentials.event_webhook_public_key;
      if (publicKey) {
        const signature = String(req.headers['x-twilio-email-event-webhook-signature'] ?? '');
        const timestamp = String(req.headers['x-twilio-email-event-webhook-timestamp'] ?? '');
        const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

        if (!rawBody) {
          logger.warn('[Email Events] No raw body available for signature verification', { label });
          res.sendStatus(403);
          return;
        }

        const isValid = verifyEventWebhookSignature(publicKey, rawBody, signature, timestamp);
        if (!isValid) {
          logger.warn('[Email Events] Invalid signature — rejecting', { label });
          res.sendStatus(403);
          return;
        }
      }

      // Always respond 200 — SendGrid retries on non-2xx
      res.sendStatus(200);

      try {
        const events = parseEventWebhook(req.body);

        for (const evt of events) {
          switch (evt.event) {
            case 'delivered':
              logger.info('[Email Events] Delivered', {
                tenant: config.tenantId,
                label,
                email: evt.email,
                sgMessageId: evt.sgMessageId,
              });
              break;
            case 'bounce':
              logger.warn('[Email Events] Bounce', {
                tenant: config.tenantId,
                label,
                email: evt.email,
                reason: evt.reason,
                type: evt.bounceType,
              });
              break;
            case 'open':
              logger.info('[Email Events] Opened', {
                tenant: config.tenantId,
                label,
                email: evt.email,
                machineOpen: evt.sgMachineOpen,
              });
              break;
            case 'click':
              logger.info('[Email Events] Clicked', { tenant: config.tenantId, label, email: evt.email, url: evt.url });
              break;
            case 'spamreport':
              logger.warn('[Email Events] Spam report', { tenant: config.tenantId, label, email: evt.email });
              break;
            case 'unsubscribe':
            case 'group_unsubscribe':
              logger.warn('[Email Events] Unsubscribe', {
                tenant: config.tenantId,
                label,
                email: evt.email,
                event: evt.event,
              });
              break;
            case 'dropped':
              logger.warn('[Email Events] Dropped', {
                tenant: config.tenantId,
                label,
                email: evt.email,
                reason: evt.dropReason,
              });
              break;
            case 'deferred':
              logger.info('[Email Events] Deferred', {
                tenant: config.tenantId,
                label,
                email: evt.email,
                attempt: evt.attempt,
              });
              break;
            default:
              logger.debug('[Email Events] Event', {
                tenant: config.tenantId,
                label,
                event: evt.event,
                email: evt.email,
              });
          }
        }
      } catch (err: unknown) {
        logger.error('[Email Events] Parse failed', {
          label,
          error: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      }
    },
  )

  // ── POST /api/sample-api/sendgrid/events ──────────────────────────────────────
  // Legacy event webhook endpoint (backward compatibility).
  // Uses single SENDGRID_EVENT_WEBHOOK_KEY env var for verification.
  // Also supports routing via custom_args (_novex_config_label, _novex_tenant_id).
  .post(
    '/events',
    express.json({
      limit: '5mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
    async (req: Request, res: Response) => {
      // Signature verification (optional — skipped if key not configured)
      const publicKey = process.env.SENDGRID_EVENT_WEBHOOK_KEY;
      if (publicKey) {
        const signature = String(req.headers['x-twilio-email-event-webhook-signature'] ?? '');
        const timestamp = String(req.headers['x-twilio-email-event-webhook-timestamp'] ?? '');
        const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

        if (!rawBody) {
          logger.warn('[Email Events] No raw body available for signature verification');
          res.sendStatus(403);
          return;
        }

        const isValid = verifyEventWebhookSignature(publicKey, rawBody, signature, timestamp);
        if (!isValid) {
          logger.warn('[Email Events] Invalid signature — rejecting');
          res.sendStatus(403);
          return;
        }
      }

      // Always respond 200 — SendGrid retries on non-2xx
      res.sendStatus(200);

      try {
        const events = parseEventWebhook(req.body);

        for (const evt of events) {
          // Try to resolve tenant context from custom_args (injected during send)
          const tenantId = evt.customArgs._novex_tenant_id;
          const configLabel = evt.customArgs._novex_config_label;

          switch (evt.event) {
            case 'delivered':
              logger.info('[Email Events] Delivered', {
                tenantId,
                configLabel,
                email: evt.email,
                sgMessageId: evt.sgMessageId,
              });
              break;
            case 'bounce':
              logger.warn('[Email Events] Bounce', {
                tenantId,
                configLabel,
                email: evt.email,
                reason: evt.reason,
                type: evt.bounceType,
              });
              break;
            case 'open':
              logger.info('[Email Events] Opened', {
                tenantId,
                configLabel,
                email: evt.email,
                machineOpen: evt.sgMachineOpen,
              });
              break;
            case 'click':
              logger.info('[Email Events] Clicked', { tenantId, configLabel, email: evt.email, url: evt.url });
              break;
            case 'spamreport':
              logger.warn('[Email Events] Spam report', { tenantId, configLabel, email: evt.email });
              break;
            case 'unsubscribe':
            case 'group_unsubscribe':
              logger.warn('[Email Events] Unsubscribe', { tenantId, configLabel, email: evt.email, event: evt.event });
              break;
            case 'dropped':
              logger.warn('[Email Events] Dropped', {
                tenantId,
                configLabel,
                email: evt.email,
                reason: evt.dropReason,
              });
              break;
            case 'deferred':
              logger.info('[Email Events] Deferred', { tenantId, configLabel, email: evt.email, attempt: evt.attempt });
              break;
            default:
              logger.debug('[Email Events] Event', { tenantId, configLabel, event: evt.event, email: evt.email });
          }
        }
      } catch (err: unknown) {
        logger.error('[Email Events] Parse failed', {
          error: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      }
    },
  );
