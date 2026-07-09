import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getVerifier, registerVerifier } from '../registry.ts';
import type { CronVerifier } from '../types.ts';

class BearerVerifier implements CronVerifier {
  #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  verify(req: Request): boolean {
    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) return false;

    const provided = auth.slice(7);
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(this.#token);

    return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
  }
}

// Register as default at module load
const token = process.env.CRON_API_KEY;
if (token) registerVerifier('bearer', new BearerVerifier(token));

// Middleware factory — default uses 'bearer', pass a name for a custom verifier
export function cronAuth(verifierName = 'bearer') {
  const verifier = getVerifier(verifierName);
  if (!verifier) {
    const msg =
      verifierName === 'bearer'
        ? 'CRON_API_KEY environment variable is not set'
        : `Cron verifier "${verifierName}" is not registered`;
    throw new Error(msg);
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ok = await verifier.verify(req);
    if (!ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}
