import { authUser } from '@common/node/auth/jwt';
import { resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
import type { WaTemplateCreate, WaTemplateUpdate } from '@common/node/comms/whatsapp2/template';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '@common/node/comms/whatsapp2/template';
import type { Request, Response } from 'express';
import express from 'express';

// WhatsApp Template Management API
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-management-api/message-templates
//
// Credentials are resolved per-tenant from the database via resolveCommsCredentials().
// Pass ?configLabel=xxx query param to select which WhatsApp config to use.

async function getCredentials(req: Request, res: Response): Promise<{ token: string; wabaId: string } | null> {
  const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
  if (!tenantId) {
    res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
    return null;
  }
  const configLabel = (req.query.configLabel as string) || (req.body?.configLabel as string) || undefined;
  try {
    const config = await resolveCommsCredentials(tenantId, 'whatsapp', configLabel);
    const token = config.credentials.token;
    const wabaId = config.senderIdentity.business_account_id;
    if (!token || !wabaId) {
      res
        .status(500)
        .json({ ok: false, error: 'WhatsApp config is missing token or business_account_id in sender identity' });
      return null;
    }
    return { token, wabaId };
  } catch (err: unknown) {
    res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : 'Failed to resolve WhatsApp credentials' });
    return null;
  }
}

export default express
  .Router()

  // ── GET /api/sample-api/whatsapp/templates ───────────────────────────────
  // Query: ?limit=N&status=APPROVED|PENDING|...&configLabel=xxx
  .get('/', authUser, async (req: Request, res: Response) => {
    const creds = await getCredentials(req, res);
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
  // Body: { name, language, category, components, configLabel? }
  .post('/', authUser, async (req: Request, res: Response) => {
    const creds = await getCredentials(req, res);
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
  // Body: { components, configLabel? }
  .post('/:id', authUser, async (req: Request, res: Response) => {
    const creds = await getCredentials(req, res);
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

  // ── DELETE /api/sample-api/whatsapp/templates?name=xxx&configLabel=xxx ──
  .delete('/', authUser, async (req: Request, res: Response) => {
    const creds = await getCredentials(req, res);
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
