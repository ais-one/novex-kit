// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: userSessions
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /user-sessions
export const UserSessionsBodySchema = z
  .object({
    user_id: z.string().uuid(),
    signing_key_id: z.string().uuid(),
    refresh_token_hash: z.string().optional(),
    refresh_expires_at: z.string().optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    device_id: z.string().optional(),
    expires_at: z.string(),
    revoked_at: z.string().optional(),
    revoke_reason: z.string().optional(),
  })
  .meta({ id: 'UserSessionsBody' });

// Partial update — all fields optional for PATCH /user-sessions/:id
export const UserSessionsUpdateSchema = UserSessionsBodySchema.partial().meta({ id: 'UserSessionsUpdate' });

// URL params — :id on /:id routes
export const UserSessionsParamsSchema = z
  .object({
    id: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'UserSessionsParams' });

// Query params — pagination for GET /user-sessions
export const UserSessionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'UserSessionsQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const UserSessionsResponseSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    signing_key_id: z.string().uuid(),
    refresh_token_hash: z.string().nullable(),
    refresh_expires_at: z.string().nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    device_id: z.string().nullable(),
    issued_at: z.string(),
    expires_at: z.string(),
    last_active_at: z.string(),
    revoked_at: z.string().nullable(),
    revoke_reason: z.string().nullable(),
  })
  .meta({ id: 'UserSessionsResponse' });
