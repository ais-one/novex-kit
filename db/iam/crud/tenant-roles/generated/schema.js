// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: tenantRoles
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /tenant-roles
export const TenantRolesBodySchema = z
  .object({
    tenant_id: z.number().int(),
    name: z.string(),
    description: z.string().optional(),
  })
  .meta({ id: 'TenantRolesBody' });

// Partial update — all fields optional for PATCH /tenant-roles/:id
export const TenantRolesUpdateSchema = TenantRolesBodySchema.partial().meta({ id: 'TenantRolesUpdate' });

// URL params — :id on /:id routes
export const TenantRolesParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'TenantRolesParams' });

// Query params — pagination for GET /tenant-roles
export const TenantRolesQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'TenantRolesQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const TenantRolesResponseSchema = z
  .object({
    id: z.number().int().positive(),
    tenant_id: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'TenantRolesResponse' });
