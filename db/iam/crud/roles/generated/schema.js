// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: roles
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /roles
export const RolesBodySchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .meta({ id: 'RolesBody' });

// Partial update — all fields optional for PATCH /roles/:id
export const RolesUpdateSchema = RolesBodySchema.partial().meta({ id: 'RolesUpdate' });

// URL params — :id on /:id routes
export const RolesParamsSchema = z
  .object({
    id: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'RolesParams' });

// Query params — pagination for GET /roles
export const RolesQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'RolesQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const RolesResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    permissions: z.unknown(),
    is_system: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'RolesResponse' });
