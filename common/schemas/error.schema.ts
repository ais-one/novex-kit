// shared/schemas/error.schema.ts
// Zod v4 — uses native .meta() for OpenAPI metadata. No monkey-patching.

import { z } from 'zod';

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().meta({ example: 'VALIDATION_ERROR' }),
      message: z.string().meta({ example: 'email and password are required' }),
    }),
  })
  .meta({ id: 'ErrorResponse' }); // id registers it as a $ref component in the spec
