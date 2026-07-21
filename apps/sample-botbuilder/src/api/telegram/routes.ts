import express from 'express';
import * as ctrl from './controller.ts';

export default express
  .Router()
  .post('/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
      await ctrl.processWebhook(req.body as Record<string, unknown>);
    } catch (err) {
      logger.error('[telegram] webhook error:', (err as Error).message);
    }
  })
  .post('/register-webhook', async (_req, res) => {
    try {
      const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE_URL;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!baseUrl || !botToken) {
        return res.status(400).json({ ok: false, error: 'TELEGRAM_WEBHOOK_BASE_URL or TELEGRAM_BOT_TOKEN not set' });
      }
      const result = await ctrl.registerWebhook(baseUrl, botToken);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('[telegram] register webhook error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .get('/webhook-info', async (_req, res) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) return res.status(400).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });
      const info = await ctrl.fetchWebhookInfo(botToken);
      res.json({ ok: true, info });
    } catch (err) {
      logger.error('[telegram] webhook info error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });
