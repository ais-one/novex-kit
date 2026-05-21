import type { WaTemplateCreate, WaTemplateUpdate } from '@common/node/comms/whatsapp2/template';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '@common/node/comms/whatsapp2/template';
import type { Request, Response } from 'express';
import express from 'express';

// WhatsApp Template Management API
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-management-api/message-templates
//
// Required env vars:
//   WHATSAPP_TOKEN                — permanent system user access token (needs whatsapp_business_management scope)
//   WHATSAPP_BUSINESS_ACCOUNT_ID  — WABA ID from Meta Business Manager

function getCredentials(res: Response): { token: string; wabaId: string } | null {
  const { WHATSAPP_TOKEN: token = '', WHATSAPP_BUSINESS_ACCOUNT_ID: wabaId = '' } = process.env;
  if (!token || !wabaId) {
    res.status(500).json({ ok: false, error: 'WHATSAPP_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID not set' });
    return null;
  }
  return { token, wabaId };
}

export default express
  .Router()

  // ── GET /api/sample-api/whatsapp/templates ───────────────────────────────
  .get('/', async (req: Request, res: Response) => {
    const creds = getCredentials(res);
    if (!creds) return;

    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status ? String(req.query.status) : undefined;

    try {
      const result = await listTemplates(creds.token, creds.wabaId, { limit, status });
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[WA Templates] list failed', { error: msg });
      res.status(500).json({ ok: false, error: msg });
    }
  })

  // ── POST /api/sample-api/whatsapp/templates ──────────────────────────────
  .post('/', async (req: Request, res: Response) => {
    const creds = getCredentials(res);
    if (!creds) return;

    const payload = req.body as WaTemplateCreate;
    if (!payload.name || !payload.language || !payload.category || !payload.components) {
      res.status(400).json({ ok: false, error: 'name, language, category, and components are required' });
      return;
    }

    try {
      const result = await createTemplate(creds.token, creds.wabaId, payload);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[WA Templates] create failed', { error: msg, payload });
      res.status(500).json({ ok: false, error: msg });
    }
  })

  // ── POST /api/sample-api/whatsapp/templates/:id ──────────────────────────
  .post('/:id', async (req: Request, res: Response) => {
    const creds = getCredentials(res);
    if (!creds) return;

    const templateId = req.params.id;
    const payload = req.body as WaTemplateUpdate;
    if (!payload.components) {
      res.status(400).json({ ok: false, error: 'components is required' });
      return;
    }

    try {
      const result = await updateTemplate(creds.token, templateId, payload);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[WA Templates] update failed', { error: msg, templateId });
      res.status(500).json({ ok: false, error: msg });
    }
  })

  // ── DELETE /api/sample-api/whatsapp/templates?name=xxx ──────────────────
  .delete('/', async (req: Request, res: Response) => {
    const creds = getCredentials(res);
    if (!creds) return;

    const name = req.query.name ? String(req.query.name) : '';
    if (!name) {
      res.status(400).json({ ok: false, error: 'name query param is required' });
      return;
    }

    try {
      const result = await deleteTemplate(creds.token, creds.wabaId, name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[WA Templates] delete failed', { error: msg, name });
      res.status(500).json({ ok: false, error: msg });
    }
  });
