// common/compiled/node/errors/validate.ts
// Express middleware factory — validates req[target] against a Zod schema.
//
// On success  → req[target] is replaced with the parsed (coerced + stripped) value.
// On failure  → calls next(ValidationError) → errorHandler → 422 JSON response.
//
// Usage:
//   router.post('/', validate('body', CreatePaymentBodySchema), asyncWrap(handler))

import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from './AppError.ts';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(target: ValidationTarget, schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      // Zod v4: result.error.issues (renamed from .errors in v3)
      const message = result.error.issues
        .map((issue: { path: PropertyKey[]; message: string }) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      next(new ValidationError(message, result.error.issues, { cause: result.error }));
      return;
    }
    // Express 5 defines `req.query` as a getter-only accessor (lib/request.js) — a plain
    // `req.query = ...` assignment throws "Cannot set property query of #<IncomingMessage>
    // which has only a getter". `Object.defineProperty` replaces it with a plain writable data
    // property instead, which Express deliberately leaves `configurable: true` for exactly this
    // case. `body`/`params` are already plain writable properties, so this is a no-op-equivalent
    // overwrite for them — one code path for all three targets.
    Object.defineProperty(req, target, { value: result.data, writable: true, enumerable: true, configurable: true });
    next();
  };
}
