// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: tenants
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /tenants
export const TenantsBodySchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    plan: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .meta({ id: 'TenantsBody' });

// Partial update — all fields optional for PATCH /tenants/:id
export const TenantsUpdateSchema = TenantsBodySchema.partial().meta({ id: 'TenantsUpdate' });

// URL params — :id on /:id routes
export const TenantsParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'TenantsParams' });

// Query params — pagination for GET /tenants
export const TenantsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'TenantsQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const TenantsResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string(),
    plan: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'TenantsResponse' });
