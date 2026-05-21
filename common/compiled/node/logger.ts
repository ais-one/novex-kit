import type { NextFunction, Request, Response } from 'express';

const LOG_LEVELS: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL ?? ''] ?? LOG_LEVELS.info;
const { npm_package_name, npm_package_version } = process.env;

/** JSON.stringify replacer that replaces circular references with '[Circular]'. */
function safeReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}

const log = (level: string, message: unknown, meta: Record<string, unknown> = {}) => {
  if (LOG_LEVELS[level] > currentLevel) return;
  const entry = JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: `${npm_package_name}@${npm_package_version}`,
      ...meta,
    },
    safeReplacer(),
  );
  // biome-ignore lint/suspicious/noConsole: Using console for logging
  level === 'error' ? console.error(entry) : console.log(entry);
};

/** Structured JSON logger. Set LOG_LEVEL env var to control verbosity (error|warn|info|debug). */
const logger = {
  error: (msg: unknown, meta?: Record<string, unknown>) => log('error', msg, meta),
  warn: (msg: unknown, meta?: Record<string, unknown>) => log('warn', msg, meta),
  info: (msg: unknown, meta?: Record<string, unknown>) => log('info', msg, meta),
  debug: (msg: unknown, meta?: Record<string, unknown>) => log('debug', msg, meta),
};
global.logger = logger;

/**
 * Express request/response logging middleware.
 * Logs incoming requests and outgoing responses with status, duration, and reason.
 * Handles client disconnects, socket timeouts, and duplicate log prevention.
 */
const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.log = logger;
  req.startTime = Date.now();
  req.socket.setTimeout(Number(process.env?.WS_KEEPALIVE_MS) || 30000);
  let logged = false;

  req.log.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  const logResponse = (status: number, reason: string | null = null) => {
    if (logged) return;
    logged = true;
    const duration = Date.now() - req.startTime;
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    req.log[logLevel](`${req.method} ${req.path} ${status}`, {
      method: req.method,
      path: req.path,
      status,
      duration: `${duration}ms`,
      ...(reason && { reason }),
    });
  };

  res.on('finish', () => logResponse(res.statusCode));
  req.on('aborted', () => logResponse(0, 'client_aborted'));
  res.on('close', () => {
    if (!res.writableEnded) logResponse(0, 'connection_closed');
  });
  req.socket.on('timeout', () => logResponse(408, 'socket_timeout'));
  next();
};

export { logger, loggerMiddleware };
