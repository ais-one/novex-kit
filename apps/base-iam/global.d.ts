declare var logger: {
  error(msg: unknown, meta?: unknown): void;
  warn(msg: unknown, meta?: unknown): void;
  info(msg: unknown, meta?: unknown): void;
  debug(msg: unknown, meta?: unknown): void;
};
// biome-ignore lint/suspicious/noExplicitAny: global config shape is dynamic at runtime
declare var __config: Readonly<Record<string, any>>;

declare namespace Express {
  interface Request {
    user?: {
      sub?: string | number;
      roles?: string[];
      tenant_id?: number;
      tenant_plan?: string | null;
      [key: string]: unknown;
    };
    fga?: {
      check(relation: string, object: string): Promise<boolean>;
    };
    rbac?: {
      hasRole(...roles: string[]): boolean;
    };
    log: {
      error(msg: unknown, meta?: Record<string, unknown>): void;
      warn(msg: unknown, meta?: Record<string, unknown>): void;
      info(msg: unknown, meta?: Record<string, unknown>): void;
      debug(msg: unknown, meta?: Record<string, unknown>): void;
    };
    startTime: number;
  }
}
