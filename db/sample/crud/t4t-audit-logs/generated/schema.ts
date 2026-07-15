// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: t4tAuditLogs
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /t4t-audit-logs
export const T4tAuditLogsBodySchema = z
  .object({
    user: z.string().optional(),
    timestamp: z.string().optional(),
    db_name: z.string().optional(),
    table_name: z.string().optional(),
    op: z.string().optional(),
    where_cols: z.string().optional(),
    where_vals: z.string().optional(),
    cols_changed: z.string().optional(),
    prev_values: z.string().optional(),
    new_values: z.string().optional(),
  })
  .meta({ id: 'T4tAuditLogsBody' });

// Partial update — all fields optional for PATCH /t4t-audit-logs/:id
export const T4tAuditLogsUpdateSchema = T4tAuditLogsBodySchema.partial().meta({ id: 'T4tAuditLogsUpdate' });

// URL params — :id on /:id routes
export const T4tAuditLogsParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'T4tAuditLogsParams' });

// Query params — pagination for GET /t4t-audit-logs
export const T4tAuditLogsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'T4tAuditLogsQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const T4tAuditLogsResponseSchema = z
  .object({
    id: z.number().int().positive(),
    user: z.string().nullable(),
    timestamp: z.string().nullable(),
    db_name: z.string().nullable(),
    table_name: z.string().nullable(),
    op: z.string().nullable(),
    where_cols: z.string().nullable(),
    where_vals: z.string().nullable(),
    cols_changed: z.string().nullable(),
    prev_values: z.string().nullable(),
    new_values: z.string().nullable(),
  })
  .meta({ id: 'T4tAuditLogsResponse' });
