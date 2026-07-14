// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: state
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /state
export const StateBodySchema = z
  .object({
    country_name: z.string().optional(),
    code: z.string().optional(),
    name: z.string().optional(),
  })
  .meta({ id: 'StateBody' });

// Partial update — all fields optional for PATCH /state/:id
export const StateUpdateSchema = StateBodySchema.partial().meta({ id: 'StateUpdate' });

// URL params — :id on /:id routes
export const StateParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'StateParams' });

// Query params — pagination for GET /state
export const StateQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'StateQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const StateResponseSchema = z
  .object({
    id: z.number().int().positive(),
    country_name: z.string().nullable(),
    code: z.string().nullable(),
    name: z.string().nullable(),
  })
  .meta({ id: 'StateResponse' });
