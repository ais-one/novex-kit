// shared/schemas/payment.schema.ts
// Zod v4 — uses native .meta() for OpenAPI metadata. No monkey-patching required.

import { z } from 'zod';

// ── Domain schema ──────────────────────────────────────────────────────────

export const PaymentSchema = z
  .object({
    id: z.guid().meta({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    amount: z.number().positive().meta({ example: 99.99 }),
    currency: z.string().length(3).meta({ example: 'USD' }),
    description: z.string().optional().meta({ example: 'Order #123' }),
    status: z.enum(['pending', 'completed', 'failed']).meta({ example: 'pending' }),
    createdAt: z.iso.datetime().meta({ example: '2025-01-01T00:00:00.000Z' }),
  })
  .meta({ id: 'Payment' });

// ── Request bodies ─────────────────────────────────────────────────────────

export const CreatePaymentBodySchema = z
  .object({
    amount: z.number().positive().meta({ example: 99.99 }),
    currency: z.string().length(3).meta({ example: 'USD' }),
    description: z.string().optional().meta({ example: 'Order #123' }),
  })
  .meta({ id: 'CreatePaymentBody' });

// ── Path parameters ────────────────────────────────────────────────────────
// z.guid() matches the same permissive format as Zod v3's z.string().uuid()

export const PaymentParamsSchema = z.object({
  id: z.guid().meta({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
});
