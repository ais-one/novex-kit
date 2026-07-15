// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: userMfaTotp
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /user-mfa-totp
export const UserMfaTotpBodySchema = z
  .object({
    user_id: z.string().uuid(),
    label: z.string().optional(),
    secret_encrypted: z.string(),
    algorithm: z.string().optional(),
    digits: z.number().int().optional(),
    period: z.number().int().optional(),
    is_active: z.boolean().optional(),
    verified_at: z.string().optional(),
  })
  .meta({ id: 'UserMfaTotpBody' });

// Partial update — all fields optional for PATCH /user-mfa-totp/:id
export const UserMfaTotpUpdateSchema = UserMfaTotpBodySchema.partial().meta({ id: 'UserMfaTotpUpdate' });

// URL params — :id on /:id routes
export const UserMfaTotpParamsSchema = z
  .object({
    id: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'UserMfaTotpParams' });

// Query params — pagination for GET /user-mfa-totp
export const UserMfaTotpQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'UserMfaTotpQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const UserMfaTotpResponseSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    label: z.string().nullable(),
    secret_encrypted: z.string(),
    algorithm: z.string(),
    digits: z.number().int(),
    period: z.number().int(),
    is_active: z.boolean(),
    verified_at: z.string().nullable(),
    created_at: z.string(),
  })
  .meta({ id: 'UserMfaTotpResponse' });
