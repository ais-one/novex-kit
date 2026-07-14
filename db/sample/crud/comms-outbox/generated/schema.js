// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: commsOutbox
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /comms-outbox
export const CommsOutboxBodySchema = z
  .object({
    tenant_id: z.number().int(),
    channel: z.string(),
    config_label: z.string().optional(),
    recipient: z.string(),
    type: z.string(),
    payload: z.unknown(),
    status: z.string().optional(),
    attempts: z.number().int().optional(),
    max_attempts: z.number().int().optional(),
    last_error: z.string().optional(),
    sent_at: z.string().optional(),
  })
  .meta({ id: 'CommsOutboxBody' });

// Partial update — all fields optional for PATCH /comms-outbox/:id
export const CommsOutboxUpdateSchema = CommsOutboxBodySchema.partial().meta({ id: 'CommsOutboxUpdate' });

// URL params — :id on /:id routes
export const CommsOutboxParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'CommsOutboxParams' });

// Query params — pagination for GET /comms-outbox
export const CommsOutboxQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'CommsOutboxQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const CommsOutboxResponseSchema = z
  .object({
    id: z.number().int().positive(),
    tenant_id: z.number().int(),
    channel: z.string(),
    config_label: z.string().nullable(),
    recipient: z.string(),
    type: z.string(),
    payload: z.unknown(),
    status: z.string(),
    attempts: z.number().int(),
    max_attempts: z.number().int(),
    last_error: z.string().nullable(),
    scheduled_at: z.string(),
    sent_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'CommsOutboxResponse' });
