declare var logger: {
  error(msg: unknown, meta?: unknown): void;
  warn(msg: unknown, meta?: unknown): void;
  info(msg: unknown, meta?: unknown): void;
  debug(msg: unknown, meta?: unknown): void;
};

declare namespace Express {
  interface Request {
    user?: {
      sub?: string | number;
      roles?: string[];
      tenant_id?: number;
      tenant_plan?: string | null;
      [key: string]: unknown;
    };
    log: {
      error(msg: unknown, meta?: Record<string, unknown>): void;
      warn(msg: unknown, meta?: Record<string, unknown>): void;
      info(msg: unknown, meta?: Record<string, unknown>): void;
      debug(msg: unknown, meta?: Record<string, unknown>): void;
    };
    startTime: number;
    /** Set by `@common/node/express/requestId.ts`'s `requestIdMiddleware` — see the structured-logging skill. */
    requestId: string;
  }
}
