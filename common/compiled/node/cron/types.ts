import type { Request } from 'express';

export interface CronVerifier {
  verify(req: Request): boolean | Promise<boolean>;
}
