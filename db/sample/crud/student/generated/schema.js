// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: student
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Insert body — fields accepted on POST /student
export const StudentBodySchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatar: z.string().optional(),
    kyc: z.string().optional(),
    awards: z.string().optional(),
    sex: z.string().optional(),
    age: z.number().int().optional(),
    gpa: z.string().optional(),
    birthDate: z.string().optional(),
    birthTime: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    dateTimeTz: z.string().optional(),
    remarks: z.string().optional(),
    updated_by: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .meta({ id: 'StudentBody' });

// Partial update — all fields optional for PATCH /student/:id
export const StudentUpdateSchema = StudentBodySchema.partial().meta({ id: 'StudentUpdate' });

// URL params — :id on /:id routes
export const StudentParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'StudentParams' });

// Query params — pagination for GET /student
export const StudentQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: 'StudentQuery' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const StudentResponseSchema = z
  .object({
    id: z.number().int().positive(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    avatar: z.string().nullable(),
    kyc: z.string().nullable(),
    awards: z.string().nullable(),
    sex: z.string().nullable(),
    age: z.number().int().nullable(),
    gpa: z.string().nullable(),
    birthDate: z.string().nullable(),
    birthTime: z.string().nullable(),
    country: z.string().nullable(),
    state: z.string().nullable(),
    dateTimeTz: z.string().nullable(),
    remarks: z.string().nullable(),
    updated_by: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .meta({ id: 'StudentResponse' });
