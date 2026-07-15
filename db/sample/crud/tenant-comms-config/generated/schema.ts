// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: tenantCommsConfig
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /tenant-comms-config
export const TenantCommsConfigBodySchema = z
  .object({
    tenant_id: z.number().int(),
    label: z.string(),
    channel: z.string(),
    provider: z.string(),
    credentials: z.string(),
    sender_identity: z.unknown().optional(),
    is_active: z.boolean().optional(),
  })
  .meta({ id: 'TenantCommsConfigBody' });

// Partial update — all fields optional for PATCH /tenant-comms-config/:id
export const TenantCommsConfigUpdateSchema = TenantCommsConfigBodySchema.partial().meta({
  id: 'TenantCommsConfigUpdate',
});

// URL params — :id on /:id routes
export const TenantCommsConfigParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'TenantCommsConfigParams' });

// Query params — pagination for GET /tenant-comms-config
export const TenantCommsConfigQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'TenantCommsConfigQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const TenantCommsConfigResponseSchema = z
  .object({
    id: z.number().int().positive(),
    tenant_id: z.number().int(),
    label: z.string(),
    channel: z.string(),
    provider: z.string(),
    credentials: z.string(),
    sender_identity: z.unknown(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: 'TenantCommsConfigResponse' });
