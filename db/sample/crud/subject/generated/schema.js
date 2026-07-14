// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: subject
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /subject
export const SubjectBodySchema = z
  .object({
    name: z.string().optional(),
    passingGrade: z.number().int().optional(),
  })
  .meta({ id: 'SubjectBody' });

// Partial update — all fields optional for PATCH /subject/:code
export const SubjectUpdateSchema = SubjectBodySchema.partial().meta({ id: 'SubjectUpdate' });

// URL params — :code on /:code routes
export const SubjectParamsSchema = z
  .object({
    code: z.string().min(1).meta({ example: 'example-id' }),
  })
  .meta({ id: 'SubjectParams' });

// Query params — pagination for GET /subject
export const SubjectQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'SubjectQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const SubjectResponseSchema = z
  .object({
    code: z.string(),
    name: z.string().nullable(),
    passingGrade: z.number().int().nullable(),
  })
  .meta({ id: 'SubjectResponse' });
