import { parseEventWebhook, verifyEventWebhookSignature } from '@common/node/comms/sendgrid/events';
import { parseInboundEmail } from '@common/node/comms/sendgrid/inbound';
import { memoryUpload } from '@common/node/express/upload';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid Inbound Parse + Event Webhook routes
// Docs:
//   Inbound Parse: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
//   Event Webhook: https://docs.sendgrid.com/for-developers/tracking-events/event
//
// Required env vars:
//   SENDGRID_EVENT_WEBHOOK_KEY — ECDSA public key for verifying event webhook signatures (optional, skips verification if not set)

const upload = memoryUpload({ limits: { fileSize: 30 * 1024 * 1024, files: 20 } });

export default express
  .Router()

  // ── POST /api/sample-api/sendgrid/inbound ─────────────────────────────────────
  // SendGrid Inbound Parse webhook — receives emails sent to your parse domain.
  // Payload: multipart/form-data with text fields + file attachments.
  //
  // Setup: SendGrid Dashboard > Settings > Inbound Parse > Add Host & URL
  //   Hostname: parse.yourdomain.com (needs MX record pointing to mx.sendgrid.net)
  //   URL: https://your-ngrok-url/api/sample-api/sendgrid/inbound
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

      logger.info('[Email Inbound] Received', {
        from: email.from,
        to: email.to,
        subject: email.subject,
        attachments: email.attachmentCount,
        spf: email.spf,
      });

      // ── Auto-reply example ────────────────────────────────────────────────
      // Uncomment the block below to send an automatic reply to every inbound email.
      // In production, add your own logic (e.g. ticket creation, AI agent, etc.)
      //
      // const senderEmail = email.envelope.from;
      // if (senderEmail) {
      //   await sendEmail(
      //     senderEmail,
      //     `Re: ${email.subject}`,
      //     `<p>Thank you for your email. We received your message:</p><blockquote>${email.text || email.html}</blockquote><p>We will get back to you shortly.</p>`,
      //   );
      //   logger.info('[Email Inbound] Auto-reply sent', { to: senderEmail });
      // }
    } catch (err: unknown) {
      logger.error('[Email Inbound] Parse failed', { error: err instanceof Error ? err.message : String(err) });
    }
  })

  // ── POST /api/sample-api/sendgrid/events ──────────────────────────────────────
  // SendGrid Event Webhook — receives delivery/engagement events (delivered, bounce, open, click, etc.)
  // Payload: JSON array of event objects.
  //
  // Setup: SendGrid Dashboard > Settings > Mail Settings > Event Webhook
  //   HTTP Post URL: https://your-ngrok-url/api/sample-api/sendgrid/events
  //   Events: check all events you want to receive
  //   Signed Event Webhook: ON (recommended — provides ECDSA signature verification)
  .post('/events', express.json({ limit: '5mb' }), async (req: Request, res: Response) => {
    // ── Signature verification (optional — skipped if key not configured) ────
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
        switch (evt.event) {
          case 'delivered':
            logger.info('[Email Events] Delivered', { email: evt.email, sgMessageId: evt.sgMessageId });
            break;
          case 'bounce':
            logger.warn('[Email Events] Bounce', { email: evt.email, reason: evt.reason, type: evt.bounceType });
            break;
          case 'open':
            logger.info('[Email Events] Opened', { email: evt.email, machineOpen: evt.sgMachineOpen });
            break;
          case 'click':
            logger.info('[Email Events] Clicked', { email: evt.email, url: evt.url });
            break;
          case 'spamreport':
            logger.warn('[Email Events] Spam report', { email: evt.email });
            break;
          case 'unsubscribe':
          case 'group_unsubscribe':
            logger.warn('[Email Events] Unsubscribe', { email: evt.email, event: evt.event });
            break;
          case 'dropped':
            logger.warn('[Email Events] Dropped', { email: evt.email, reason: evt.dropReason });
            break;
          case 'deferred':
            logger.info('[Email Events] Deferred', { email: evt.email, attempt: evt.attempt });
            break;
          default:
            logger.debug('[Email Events] Event', { event: evt.event, email: evt.email });
        }
      }

      // ── Custom event handling ───────────────────────────────────────────────
      // Add your own logic here, e.g.:
      // - Store events in a database for analytics
      // - Trigger alerts on bounces/spam reports
      // - Update user engagement scores
      // - Remove bounced addresses from mailing lists
    } catch (err: unknown) {
      logger.error('[Email Events] Parse failed', {
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  });
