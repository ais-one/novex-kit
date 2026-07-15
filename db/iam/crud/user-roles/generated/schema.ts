// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: userRoles
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /user-roles
export const UserRolesBodySchema = z
  .object({
    user_id: z.string().uuid(),
    role_id: z.string().uuid(),
    granted_by: z.string().uuid().optional(),
    expires_at: z.string().optional(),
  })
  .meta({ id: 'UserRolesBody' });

// Partial update — all fields optional for PATCH /user-roles/:id
export const UserRolesUpdateSchema = UserRolesBodySchema.partial().meta({ id: 'UserRolesUpdate' });

// URL params — :id on /:id routes
export const UserRolesParamsSchema = z
  .object({
    id: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'UserRolesParams' });

// Query params — pagination for GET /user-roles
export const UserRolesQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'UserRolesQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const UserRolesResponseSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    role_id: z.string().uuid(),
    granted_by: z.string().uuid().nullable(),
    granted_at: z.string(),
    expires_at: z.string().nullable(),
  })
  .meta({ id: 'UserRolesResponse' });
