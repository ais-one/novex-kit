declare var logger: {
  error(msg: unknown, meta?: unknown): void;
  warn(msg: unknown, meta?: unknown): void;
  info(msg: unknown, meta?: unknown): void;
  debug(msg: unknown, meta?: unknown): void;
};
declare var __config: Readonly<Record<string, unknown>>;
