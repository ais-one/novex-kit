// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: userFederatedIdentities
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /user-federated-identities
export const UserFederatedIdentitiesBodySchema = z
  .object({
    user_id: z.string().uuid(),
    provider: z.string(),
    provider_user_id: z.string(),
    provider_email: z.string().optional(),
    provider_display_name: z.string().optional(),
    access_token_encrypted: z.string().optional(),
    refresh_token_encrypted: z.string().optional(),
    token_expires_at: z.string().optional(),
  })
  .meta({ id: 'UserFederatedIdentitiesBody' });

// Partial update — all fields optional for PATCH /user-federated-identities/:id
export const UserFederatedIdentitiesUpdateSchema = UserFederatedIdentitiesBodySchema.partial().meta({
  id: 'UserFederatedIdentitiesUpdate',
});

// URL params — :id on /:id routes
export const UserFederatedIdentitiesParamsSchema = z
  .object({
    id: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'UserFederatedIdentitiesParams' });

// Query params — pagination for GET /user-federated-identities
export const UserFederatedIdentitiesQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'UserFederatedIdentitiesQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const UserFederatedIdentitiesResponseSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    provider: z.string(),
    provider_user_id: z.string(),
    provider_email: z.string().nullable(),
    provider_display_name: z.string().nullable(),
    access_token_encrypted: z.string().nullable(),
    refresh_token_encrypted: z.string().nullable(),
    token_expires_at: z.string().nullable(),
    scopes: z.unknown(),
    metadata: z.unknown(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'UserFederatedIdentitiesResponse' });
