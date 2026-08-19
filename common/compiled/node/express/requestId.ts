import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** The one canonical header name for request tracing across this repo — see the structured-logging skill. */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Reads `x-request-id` from an upstream caller (this is how a request ID crosses an app
 * boundary — vision-mcp calling vision-custom-api, for example) or mints a new one with
 * `crypto.randomUUID()`. Echoes the same value back as a response header so a client-observed
 * ID matches what shows up in this server's logs.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  req.requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
};
