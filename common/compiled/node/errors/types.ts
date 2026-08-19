export interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
  /** The wrapped lower-level error, if the thrown `AppError` was constructed with `{ cause }`. */
  cause?: unknown;
  isOperational: boolean;
}
