// shared/schemas/error.schema.ts
// Zod v4 — uses native .meta() for OpenAPI metadata. No monkey-patching.

import { z } from 'zod';

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().meta({ example: 'VALIDATION_ERROR' }),
      message: z.string().meta({ example: 'email and password are required' }),
      // present only when non-null — a validate() failure puts the zod `issues` array here
      details: z.unknown().optional().meta({ description: 'Extra error context, e.g. zod validation issues' }),
      // added by errorHandler only when NODE_ENV=development — never sent in other environments
      stack: z.string().optional().meta({ description: 'Stack trace (development only)' }),
    }),
  })
  .meta({ id: 'ErrorResponse' }); // id registers it as a $ref component in the spec
