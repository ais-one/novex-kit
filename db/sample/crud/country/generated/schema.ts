// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: country
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /country
export const CountryBodySchema = z
  .object({
    name: z.string().optional(),
    code: z.string().optional(),
    icc: z.string().optional(),
    updated: z.string().optional(),
  })
  .meta({ id: 'CountryBody' });

// Partial update — all fields optional for PATCH /country/:id
export const CountryUpdateSchema = CountryBodySchema.partial().meta({ id: 'CountryUpdate' });

// URL params — :id on /:id routes
export const CountryParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'CountryParams' });

// Query params — pagination for GET /country
export const CountryQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'CountryQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const CountryResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().nullable(),
    code: z.string().nullable(),
    icc: z.string().nullable(),
    updated: z.string().nullable(),
  })
  .meta({ id: 'CountryResponse' });
