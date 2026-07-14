// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: authAuditLog
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /auth-audit-log
export const AuthAuditLogBodySchema = z
  .object({
    user_id: z.string().uuid().optional(),
    actor_id: z.string().uuid().optional(),
    event_type: z.string(),
    channel: z.string().optional(),
    provider: z.string().optional(),
    session_id: z.string().uuid().optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
  })
  .meta({ id: 'AuthAuditLogBody' });

// Partial update — all fields optional for PATCH /auth-audit-log/:id
export const AuthAuditLogUpdateSchema = AuthAuditLogBodySchema.partial().meta({ id: 'AuthAuditLogUpdate' });

// URL params — :id on /:id routes
export const AuthAuditLogParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'AuthAuditLogParams' });

// Query params — pagination for GET /auth-audit-log
export const AuthAuditLogQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'AuthAuditLogQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const AuthAuditLogResponseSchema = z
  .object({
    id: z.number().int().positive(),
    user_id: z.string().uuid().nullable(),
    actor_id: z.string().uuid().nullable(),
    event_type: z.string(),
    channel: z.string().nullable(),
    provider: z.string().nullable(),
    session_id: z.string().uuid().nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    metadata: z.unknown(),
    created_at: z.string(),
  })
  .meta({ id: 'AuthAuditLogResponse' });
