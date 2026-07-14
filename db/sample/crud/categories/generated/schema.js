// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: categories
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /categories
export const CategoriesBodySchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .meta({ id: 'CategoriesBody' });

// Partial update — all fields optional for PATCH /categories/:id
export const CategoriesUpdateSchema = CategoriesBodySchema.partial().meta({ id: 'CategoriesUpdate' });

// URL params — :id on /:id routes
export const CategoriesParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'CategoriesParams' });

// Query params — pagination for GET /categories
export const CategoriesQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'CategoriesQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const CategoriesResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().nullable(),
  })
  .meta({ id: 'CategoriesResponse' });
