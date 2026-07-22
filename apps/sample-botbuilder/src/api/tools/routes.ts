import express from 'express';
import { TOOL_OUTPUT_SCHEMAS } from '../../graph/tool-output-schemas.ts';
import * as ctrl from './controller.ts';

export default express
  .Router()
  .get('/', async (_req, res) => {
    try {
      const tools = await ctrl.listTools();
      res.json({ ok: true, tools });
    } catch (err) {
      logger.error('[tools] list error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .get('/output-schemas', (_req, res) => {
    res.json({ ok: true, schemas: TOOL_OUTPUT_SCHEMAS });
  });
