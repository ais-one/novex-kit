// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: award
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /award
export const AwardBodySchema = z
  .object({
    name: z.string().optional(),
  })
  .meta({ id: 'AwardBody' });

// Partial update — all fields optional for PATCH /award/:code
export const AwardUpdateSchema = AwardBodySchema.partial().meta({ id: 'AwardUpdate' });

// URL params — :code on /:code routes
export const AwardParamsSchema = z
  .object({
    code: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'AwardParams' });

// Query params — pagination for GET /award
export const AwardQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'AwardQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const AwardResponseSchema = z
  .object({
    code: z.string(),
    name: z.string().nullable(),
  })
  .meta({ id: 'AwardResponse' });
