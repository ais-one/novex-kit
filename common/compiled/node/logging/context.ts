export type Layer = 'controller' | 'service' | 'repository';

export type LogContext = {
  requestId: string;
  layer: Layer;
  fn: string;
};

export type BaseLogger = {
  error(msg: unknown, meta?: unknown): void;
  warn(msg: unknown, meta?: unknown): void;
  info(msg: unknown, meta?: unknown): void;
  debug(msg: unknown, meta?: unknown): void;
};

export type ContextLogger = {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  /** Derive a child logger for the next hop — same requestId, override layer/fn. */
  scope(next: Partial<LogContext>): ContextLogger;
  /** Read-only — lets a repository forward `context.requestId` on an outbound call without a separate parameter. */
  readonly context: Readonly<LogContext>;
};

const LEVELS = ['error', 'warn', 'info', 'debug'] as const;

/**
 * Wraps the base structured-log transport (`common/node/logger`'s `logger`) with a fixed
 * context (requestId, layer, fn) merged into every call. This is what gets passed down as
 * a parameter (or constructor dependency) instead of importing the global `logger` inside a
 * controller/service/repository — see the `structured-logging` skill.
 *
 * Context fields always win over a same-named key in a call's own `meta`, so a stray
 * `{ layer: '...' }` in meta can never silently override the logger's actual identity.
 */
export function createLogger(base: BaseLogger, context: LogContext): ContextLogger {
  const bind =
    (level: (typeof LEVELS)[number]) =>
    (msg: string, meta: Record<string, unknown> = {}) =>
      base[level](msg, { ...meta, ...context });

  return {
    error: bind('error'),
    warn: bind('warn'),
    info: bind('info'),
    debug: bind('debug'),
    scope(next: Partial<LogContext>): ContextLogger {
      return createLogger(base, { ...context, ...next });
    },
    context,
  };
}
