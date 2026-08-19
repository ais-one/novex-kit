import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from './AppError.ts';
import type { NormalizedError } from './types.ts';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Normalize any thrown value into a consistent NormalizedError shape.
 * Express v5 auto-forwards async rejections, but the thrown value may not be an AppError.
 */
function normalizeError(err: unknown): NormalizedError {
  const e = err as Record<string, unknown>;

  if (e?.isOperational) {
    return {
      statusCode: Number(e.statusCode) || 500,
      code: String(e.code || 'INTERNAL_ERROR'),
      message: String(e.message || 'An unexpected error occurred'),
      details: e.details,
      stack: typeof e.stack === 'string' ? e.stack : undefined,
      cause: e.cause,
      isOperational: true,
    };
  }

  if (e?.type === 'entity.parse.failed') {
    return { statusCode: 400, code: 'INVALID_JSON', message: 'Malformed JSON in request body', isOperational: true };
  }

  const status = typeof e?.status === 'number' && e.status >= 400 && e.status < 600 ? e.status : 500;

  return {
    statusCode: status,
    code: typeof e?.code === 'string' ? e.code : 'INTERNAL_ERROR',
    message: isDev ? String(e?.message ?? 'Unknown error') : 'An unexpected error occurred',
    stack: typeof e?.stack === 'string' ? e.stack : undefined,
    isOperational: false,
  };
}

/**
 * Central error-handling middleware.
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) {
    return _next(err);
  }

  const error = normalizeError(err);
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} ${statusCode}`, {
      type: 'server_error',
      code: error.code,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      layer: 'controller',
      fn: 'errorHandler',
      stack: error.stack,
      ...(error.cause !== undefined && {
        cause: error.cause instanceof Error ? error.cause.stack : String(error.cause),
      }),
    });
  } else if (isDev) {
    logger.warn(`${req.method} ${req.path} ${statusCode}`, {
      type: 'client_error',
      code: error.code,
      status: statusCode,
      path: req.path,
      requestId: req.requestId,
      layer: 'controller',
      fn: 'errorHandler',
    });
  }

  const body = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && error.details !== null && { details: error.details }),
      ...(isDev && { stack: error.stack }),
    },
  };

  res.status(statusCode).json(body);
};

/** Catch-all 404 handler — place this after all your routes. */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(req.path));
};
