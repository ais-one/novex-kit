declare var logger: {
  error(msg: unknown, meta?: unknown): void;
  warn(msg: unknown, meta?: unknown): void;
  info(msg: unknown, meta?: unknown): void;
  debug(msg: unknown, meta?: unknown): void;
};

declare namespace Express {
  interface Request {
    log: {
      error(msg: unknown, meta?: Record<string, unknown>): void;
      warn(msg: unknown, meta?: Record<string, unknown>): void;
      info(msg: unknown, meta?: Record<string, unknown>): void;
      debug(msg: unknown, meta?: Record<string, unknown>): void;
    };
    startTime: number;
  }
}
