// shared/schemas/api-response.schema.ts
// The one success-response envelope every controller in this repo uses — { message, data }.
// Zod v4 — uses native .meta() for OpenAPI metadata. No monkey-patching.
// Error responses are a separate, already-established shape — see error.schema.ts.

import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

/**
 * Builds the `{ message, data }` envelope schema for one endpoint's `data` shape.
 * `data` is nullable, never optional — a response with nothing to return sends `data: null`,
 * not an omitted key.
 */
export const ApiResponseSchema = (dataSchema: ZodTypeAny, id: string) =>
  z
    .object({
      message: z.string().meta({ example: 'Operation completed successfully' }),
      data: dataSchema.nullable(),
    })
    .meta({ id });
