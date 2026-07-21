import express from 'express';
import * as ctrl from './controller.ts';

export default express
  .Router()
  .get('/configs', async (_req, res) => {
    try {
      const configs = await ctrl.listConfigs();
      res.json({ ok: true, configs });
    } catch (err) {
      logger.error('[graph] list configs error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .get('/configs/:id', async (req, res) => {
    try {
      const config = await ctrl.getConfig(Number(req.params.id));
      if (!config) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, config });
    } catch (err) {
      logger.error('[graph] get config error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .post('/configs', async (req, res) => {
    try {
      const { name, description, flow, status } = req.body as {
        name: string;
        description?: string;
        flow: unknown;
        status?: string;
      };
      if (!name || !flow) return res.status(400).json({ ok: false, error: 'name and flow are required' });
      const config = await ctrl.createConfig({ name, description, flow, status });
      res.json({ ok: true, config });
    } catch (err) {
      logger.error('[graph] create config error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .put('/configs/:id', async (req, res) => {
    try {
      const { name, description, flow, status } = req.body as {
        name: string;
        description?: string;
        flow: unknown;
        status?: string;
      };
      const config = await ctrl.updateConfig(Number(req.params.id), { name, description, flow, status });
      if (!config) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, config });
    } catch (err) {
      logger.error('[graph] update config error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .delete('/configs/:id', async (req, res) => {
    try {
      await ctrl.deleteConfig(Number(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      logger.error('[graph] delete config error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });
