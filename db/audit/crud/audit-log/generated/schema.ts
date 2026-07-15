// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: auditLog
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /audit-log
export const AuditLogBodySchema = z
  .object({
    table_name: z.string(),
    operation: z.string(),
    app_user_id: z.string().optional(),
    tenant_id: z.string().optional(),
    session_id: z.string().optional(),
    transaction_id: z.string().uuid().optional(),
    old_data: z.unknown().optional(),
    new_data: z.unknown().optional(),
    changed_fields: z.array(z.string()).optional(),
  })
  .meta({ id: 'AuditLogBody' });

// Partial update — all fields optional for PATCH /audit-log/:id
export const AuditLogUpdateSchema = AuditLogBodySchema.partial().meta({ id: 'AuditLogUpdate' });

// URL params — :id on /:id routes
export const AuditLogParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'AuditLogParams' });

// Query params — pagination for GET /audit-log
export const AuditLogQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'AuditLogQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const AuditLogResponseSchema = z
  .object({
    id: z.number().int().positive(),
    changed_at: z.string(),
    table_name: z.string(),
    operation: z.string(),
    app_user_id: z.string().nullable(),
    tenant_id: z.string().nullable(),
    session_id: z.string().nullable(),
    transaction_id: z.string().uuid().nullable(),
    db_user: z.string(),
    ip_addr: z.string().nullable(),
    app_name: z.string().nullable(),
    old_data: z.unknown().nullable(),
    new_data: z.unknown().nullable(),
    changed_fields: z.array(z.string()).nullable(),
  })
  .meta({ id: 'AuditLogResponse' });
