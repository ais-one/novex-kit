// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: permissions
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /permissions
export const PermissionsBodySchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .meta({ id: 'PermissionsBody' });

// Partial update — all fields optional for PATCH /permissions/:id
export const PermissionsUpdateSchema = PermissionsBodySchema.partial().meta({ id: 'PermissionsUpdate' });

// URL params — :id on /:id routes
export const PermissionsParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'PermissionsParams' });

// Query params — pagination for GET /permissions
export const PermissionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'PermissionsQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const PermissionsResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'PermissionsResponse' });
