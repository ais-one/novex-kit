// shared/schemas/notification.schema.ts
// Zod v4 — uses native .meta() for OpenAPI metadata. No monkey-patching required.

import { z } from 'zod';

// ── Domain schema ──────────────────────────────────────────────────────────

export const NotificationSchema = z
  .object({
    id: z.guid().meta({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    recipient: z.string().meta({ example: 'user@example.com' }),
    channel: z.enum(['email', 'sms', 'push']).meta({ example: 'email' }),
    message: z.string().meta({ example: 'Your order has been confirmed.' }),
    status: z.enum(['sent', 'failed']).meta({ example: 'sent' }),
    sentAt: z.iso.datetime().meta({ example: '2025-01-01T00:00:00.000Z' }),
  })
  .meta({ id: 'Notification' });

// ── Request bodies ─────────────────────────────────────────────────────────

export const SendNotificationBodySchema = z
  .object({
    recipient: z.string().min(1).meta({ example: 'user@example.com' }),
    channel: z.enum(['email', 'sms', 'push']).meta({ example: 'email' }),
    message: z.string().min(1).meta({ example: 'Your order has been confirmed.' }),
  })
  .meta({ id: 'SendNotificationBody' });

// ── Path parameters ────────────────────────────────────────────────────────

export const NotificationParamsSchema = z.object({
  id: z.guid().meta({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
});
