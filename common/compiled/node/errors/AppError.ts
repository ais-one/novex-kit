export type AppErrorOptions = { cause?: unknown };

/**
 * Base class for all known operational errors. Pass `{ cause }` when wrapping a lower-level
 * error (a driver error, a ZodError, another service's error) so the full chain survives to
 * wherever it's actually logged — see the structured-logging skill's "Stack traces and error
 * handling" section. `err.cause` is a native `Error` feature; nothing extra to import.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details: unknown;
  isOperational: boolean;
  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details: unknown = null,
    options?: AppErrorOptions,
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Thrown when a requested resource does not exist (404). */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', options?: AppErrorOptions) {
    super(`${resource} not found`, 404, 'NOT_FOUND', null, options);
  }
}

/** Thrown when request input fails schema validation (422). */
export class ValidationError extends AppError {
  constructor(message: string, details: unknown = null, options?: AppErrorOptions) {
    super(message, 422, 'VALIDATION_ERROR', details, options);
  }
}

/** Thrown when the caller is not authenticated or lacks permission (401). */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', options?: AppErrorOptions) {
    super(message, 401, 'UNAUTHORIZED', null, options);
  }
}
