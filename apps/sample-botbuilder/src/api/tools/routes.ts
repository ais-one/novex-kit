import express from 'express';
import * as ctrl from './controller.ts';

export default express.Router().get('/', async (_req, res) => {
  try {
    const tools = await ctrl.listTools();
    res.json({ ok: true, tools });
  } catch (err) {
    logger.error('[tools] list error:', (err as Error).message);
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
