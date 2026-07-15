import { authUser } from '@common/node/auth/jwt';
import {
  activateTemplateVersion,
  createTemplate,
  createTemplateVersion,
  deleteTemplate,
  deleteTemplateVersion,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  updateTemplateVersion,
} from '@common/node/comms/sendgrid/template';
import type { SgTemplateVersionData } from '@common/node/comms/sendgrid/types';
import { resolveCommsCredentials } from '@common/node/comms/tenant/resolver';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid Dynamic Templates API routes
// Docs: https://docs.sendgrid.com/api-reference/transactional-templates/
//
// Credentials are resolved per-tenant from the database via resolveCommsCredentials().
// Pass ?configLabel=xxx query param to select which email config to use.

function handleError(res: Response, err: unknown, context: string) {
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  logger.error(`[Email Templates] ${context} failed`, { error: msg });
  res.status(500).json({ ok: false, error: msg });
}

async function getApiKey(req: Request, res: Response): Promise<string | null> {
  const tenantId = (req as any).user?.tenant_id ?? (process.env.NODE_ENV === 'development' ? 1 : null);
  if (!tenantId) {
    res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
    return null;
  }
  const configLabel = (req.query.configLabel as string) || (req.body?.configLabel as string) || undefined;
  try {
    const config = await resolveCommsCredentials(tenantId, 'email', configLabel);
    return config.credentials.api_key;
  } catch (err: unknown) {
    res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : 'Failed to resolve email credentials' });
    return null;
  }
}

export default express
  .Router()

  // ── GET /api/sample-api/sendgrid/templates ──────────────────────────────────
  // List all dynamic templates. Query: ?pageSize=N&pageToken=xxx&configLabel=xxx
  .get('/', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const pageToken = req.query.pageToken ? String(req.query.pageToken) : undefined;
    try {
      const data = await listTemplates(apiKey, { pageSize, pageToken });
      res.json({ ok: true, templates: data.templates ?? [] });
    } catch (err: unknown) {
      handleError(res, err, 'list');
    }
  })

  // ── POST /api/sample-api/sendgrid/templates ─────────────────────────────────
  // Create a new (empty) dynamic template. Body: { name, configLabel? }
  .post('/', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    try {
      const result = await createTemplate(apiKey, name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'create');
    }
  })

  // ── GET /api/sample-api/sendgrid/templates/:id ──────────────────────────────
  // Get a single template with all its versions.
  .get('/:id', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    try {
      const result = await getTemplate(apiKey, req.params.id);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'get');
    }
  })

  // ── PATCH /api/sample-api/sendgrid/templates/:id ────────────────────────────
  // Rename a template. Body: { name, configLabel? }
  .patch('/:id', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    try {
      const result = await updateTemplate(apiKey, req.params.id, name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'update');
    }
  })

  // ── POST /api/sample-api/sendgrid/templates/:id/duplicate ──────────────────
  // Duplicate a template. Body: { name?, configLabel? }
  .post('/:id/duplicate', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    const { name } = req.body as { name?: string };
    try {
      const result = await duplicateTemplate(apiKey, req.params.id, name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'duplicate');
    }
  })

  // ── DELETE /api/sample-api/sendgrid/templates/:id ───────────────────────────
  // Delete a template and all its versions.
  .delete('/:id', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    try {
      await deleteTemplate(apiKey, req.params.id);
      res.json({ ok: true });
    } catch (err: unknown) {
      handleError(res, err, 'delete');
    }
  })

  // ── POST /api/sample-api/sendgrid/templates/:id/versions ───────────────────
  // Create a new version. Body: SgTemplateVersionData & { configLabel? }
  .post('/:id/versions', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    const data = req.body as SgTemplateVersionData;
    if (!data.name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    try {
      const result = await createTemplateVersion(apiKey, req.params.id, data);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'createVersion');
    }
  })

  // ── PATCH /api/sample-api/sendgrid/templates/:id/versions/:vid ─────────────
  // Update a version's content, subject or name.
  .patch('/:id/versions/:vid', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    const data = req.body as Partial<SgTemplateVersionData>;
    try {
      const result = await updateTemplateVersion(apiKey, req.params.id, req.params.vid, data);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'updateVersion');
    }
  })

  // ── POST /api/sample-api/sendgrid/templates/:id/versions/:vid/activate ─────
  // Activate a version (make it the live version for this template).
  .post('/:id/versions/:vid/activate', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    try {
      const result = await activateTemplateVersion(apiKey, req.params.id, req.params.vid);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'activateVersion');
    }
  })

  // ── DELETE /api/sample-api/sendgrid/templates/:id/versions/:vid ────────────
  // Permanently delete a template version.
  .delete('/:id/versions/:vid', authUser, async (req: Request, res: Response) => {
    const apiKey = await getApiKey(req, res);
    if (!apiKey) return;

    try {
      await deleteTemplateVersion(apiKey, req.params.id, req.params.vid);
      res.json({ ok: true });
    } catch (err: unknown) {
      handleError(res, err, 'deleteVersion');
    }
  });
