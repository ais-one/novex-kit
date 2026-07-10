import { processBatch } from '@common/node/comms/service/outbox';
import { logger } from '@common/node/logger';
import type { Request, Response } from 'express';

export async function process(_req: Request, res: Response): Promise<void> {
  // Respond immediately — the scheduler gets a fast 202, avoiding timeout/retry.
  // processBatch() runs in background; per-row errors are handled internally.
  res.status(202).json({ accepted: true });

  try {
    await processBatch();
  } catch (err) {
    logger.error('[process-outbox] batch failed', err);
  }
}
