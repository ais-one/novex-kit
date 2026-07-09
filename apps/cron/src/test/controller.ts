import type { Request, Response } from 'express';

export async function test(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    message: 'Cron service is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
