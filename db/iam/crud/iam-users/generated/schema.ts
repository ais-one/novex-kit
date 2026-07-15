// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: iamUsers
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /iam-users
export const IamUsersBodySchema = z
  .object({
    username: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    display_name: z.string().optional(),
    avatar_url: z.string().optional(),
    status: z.string().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
    roles: z.string().optional(),
    revoked: z.string().optional(),
    gaKey: z.string().optional(),
    githubId: z.number().int().optional(),
  })
  .meta({ id: 'IamUsersBody' });

// Partial update — all fields optional for PATCH /iam-users/:id
export const IamUsersUpdateSchema = IamUsersBodySchema.partial().meta({ id: 'IamUsersUpdate' });

// URL params — :id on /:id routes
export const IamUsersParamsSchema = z
  .object({
    id: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'IamUsersParams' });

// Query params — pagination for GET /iam-users
export const IamUsersQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'IamUsersQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const IamUsersResponseSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string().nullable(),
    email: z.string().nullable(),
    email_verified_at: z.string().nullable(),
    phone: z.string().nullable(),
    phone_verified_at: z.string().nullable(),
    display_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
    status: z.string(),
    locale: z.string(),
    timezone: z.string().nullable(),
    metadata: z.unknown(),
    roles: z.string().nullable(),
    revoked: z.string().nullable(),
    githubId: z.number().int().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable(),
  })
  .meta({ id: 'IamUsersResponse' });
