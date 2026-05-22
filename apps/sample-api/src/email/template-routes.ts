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
} from '@common/node/comms/email2/template';
import type { SgTemplateVersionData } from '@common/node/comms/email2/types';
import type { Request, Response } from 'express';
import express from 'express';

// SendGrid Dynamic Templates API routes
// Docs: https://docs.sendgrid.com/api-reference/transactional-templates/
//
// Required env vars:
//   SENDGRID_KEY — API key from SendGrid Dashboard → Settings → API Keys
//                  Permissions: Template Engine (Full Access)

function handleError(res: Response, err: unknown, context: string) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`[Email Templates] ${context} failed`, { error: msg });
  res.status(500).json({ ok: false, error: msg });
}

export default express
  .Router()

  // ── GET /api/sample-api/email/templates ───────────────────────────────────
  // List all dynamic templates. Query: ?pageSize=N&pageToken=xxx
  .get('/', async (req: Request, res: Response) => {
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const pageToken = req.query.pageToken ? String(req.query.pageToken) : undefined;
    try {
      const data = await listTemplates({ pageSize, pageToken });
      res.json({ ok: true, templates: data.templates ?? [] });
    } catch (err: unknown) {
      handleError(res, err, 'list');
    }
  })

  // ── POST /api/sample-api/email/templates ──────────────────────────────────
  // Create a new (empty) dynamic template. Body: { name }
  .post('/', async (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    try {
      const result = await createTemplate(name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'create');
    }
  })

  // ── GET /api/sample-api/email/templates/:id ───────────────────────────────
  // Get a single template with all its versions.
  .get('/:id', async (req: Request, res: Response) => {
    try {
      const result = await getTemplate(req.params.id);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'get');
    }
  })

  // ── PATCH /api/sample-api/email/templates/:id ─────────────────────────────
  // Rename a template. Body: { name }
  .patch('/:id', async (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    try {
      const result = await updateTemplate(req.params.id, name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'update');
    }
  })

  // ── POST /api/sample-api/email/templates/:id/duplicate ───────────────────
  // Duplicate a template. Body: { name? }
  .post('/:id/duplicate', async (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    try {
      const result = await duplicateTemplate(req.params.id, name);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'duplicate');
    }
  })

  // ── DELETE /api/sample-api/email/templates/:id ────────────────────────────
  // Delete a template and all its versions.
  .delete('/:id', async (req: Request, res: Response) => {
    try {
      await deleteTemplate(req.params.id);
      res.json({ ok: true });
    } catch (err: unknown) {
      handleError(res, err, 'delete');
    }
  })

  // ── POST /api/sample-api/email/templates/:id/versions ────────────────────
  // Create a new version. Body: SgTemplateVersionData
  .post('/:id/versions', async (req: Request, res: Response) => {
    const data = req.body as SgTemplateVersionData;
    if (!data.name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    try {
      const result = await createTemplateVersion(req.params.id, data);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'createVersion');
    }
  })

  // ── PATCH /api/sample-api/email/templates/:id/versions/:vid ──────────────
  // Update a version's content, subject or name.
  .patch('/:id/versions/:vid', async (req: Request, res: Response) => {
    const data = req.body as Partial<SgTemplateVersionData>;
    try {
      const result = await updateTemplateVersion(req.params.id, req.params.vid, data);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'updateVersion');
    }
  })

  // ── POST /api/sample-api/email/templates/:id/versions/:vid/activate ──────
  // Activate a version (make it the live version for this template).
  .post('/:id/versions/:vid/activate', async (req: Request, res: Response) => {
    try {
      const result = await activateTemplateVersion(req.params.id, req.params.vid);
      res.json({ ok: true, ...result });
    } catch (err: unknown) {
      handleError(res, err, 'activateVersion');
    }
  })

  // ── DELETE /api/sample-api/email/templates/:id/versions/:vid ─────────────
  // Permanently delete a template version.
  .delete('/:id/versions/:vid', async (req: Request, res: Response) => {
    try {
      await deleteTemplateVersion(req.params.id, req.params.vid);
      res.json({ ok: true });
    } catch (err: unknown) {
      handleError(res, err, 'deleteVersion');
    }
  });
