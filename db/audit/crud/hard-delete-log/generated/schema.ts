// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: hardDeleteLog
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /hard-delete-log
export const HardDeleteLogBodySchema = z
  .object({
    table_name: z.string(),
    record_id: z.string(),
    deleted_by: z.string(),
    reason: z.string(),
    deleted_data: z.unknown(),
  })
  .meta({ id: 'HardDeleteLogBody' });

// Partial update — all fields optional for PATCH /hard-delete-log/:id
export const HardDeleteLogUpdateSchema = HardDeleteLogBodySchema.partial().meta({ id: 'HardDeleteLogUpdate' });

// URL params — :id on /:id routes
export const HardDeleteLogParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'HardDeleteLogParams' });

// Query params — pagination for GET /hard-delete-log
export const HardDeleteLogQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'HardDeleteLogQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const HardDeleteLogResponseSchema = z
  .object({
    id: z.number().int().positive(),
    deleted_at: z.string(),
    table_name: z.string(),
    record_id: z.string(),
    deleted_by: z.string(),
    reason: z.string(),
    deleted_data: z.unknown(),
  })
  .meta({ id: 'HardDeleteLogResponse' });
