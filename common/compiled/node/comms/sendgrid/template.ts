// SendGrid v3 Dynamic Templates API — template management helpers
// Docs: https://docs.sendgrid.com/api-reference/transactional-templates/
//
// Uses the same SENDGRID_KEY as outbound.ts — no additional env vars needed.
// All template IDs start with d- (dynamic generation).

import type { SgTemplate, SgTemplateVersion, SgTemplateVersionData } from './types.ts';

export type { SgTemplate, SgTemplateVersion, SgTemplateVersionData };

const BASE = 'https://api.sendgrid.com/v3';

// ─── Error class ──────────────────────────────────────────────────────────────

export class SgTemplateError extends Error {
  status: number;
  errors: unknown[];
  constructor(message: string, status: number, errors: unknown[] = []) {
    super(`[SendGrid Template] HTTP ${status}: ${message}`);
    this.status = status;
    this.errors = errors;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.SENDGRID_KEY;
  if (!key) throw new Error('SENDGRID_KEY is not defined');
  return key;
}

async function tmplRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const key = getApiKey();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — successful delete, no body
  if (res.status === 204) return {} as T;

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const errors = Array.isArray(data.errors) ? (data.errors as { message: string }[]) : [];
    const msg = errors[0]?.message ?? (data.message as string | undefined) ?? `HTTP ${res.status}`;
    throw new SgTemplateError(msg, res.status, errors);
  }

  return data as T;
}

// ─── Template CRUD ────────────────────────────────────────────────────────────

/**
 * List all dynamic templates (paginated).
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates/retrieve-paged-transactional-templates
 */
export async function listTemplates(opts: { pageSize?: number; pageToken?: string } = {}): Promise<{
  templates: SgTemplate[];
  _metadata?: { self: string; next?: string; prev?: string; count: number };
}> {
  const params = new URLSearchParams({ generations: 'dynamic' });
  if (opts.pageSize) params.set('page_size', String(opts.pageSize));
  if (opts.pageToken) params.set('page_token', opts.pageToken);
  return tmplRequest('GET', `/templates?${params}`);
}

/**
 * Get a single template with all its versions.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates/retrieve-a-single-transactional-template
 */
export async function getTemplate(templateId: string): Promise<SgTemplate> {
  return tmplRequest('GET', `/templates/${templateId}`);
}

/**
 * Create a new empty dynamic template.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates/create-a-transactional-template
 */
export async function createTemplate(name: string, generation: 'dynamic' | 'legacy' = 'dynamic'): Promise<SgTemplate> {
  return tmplRequest('POST', '/templates', { name, generation });
}

/**
 * Rename an existing template.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates/edit-a-transactional-template
 */
export async function updateTemplate(templateId: string, name: string): Promise<SgTemplate> {
  return tmplRequest('PATCH', `/templates/${templateId}`, { name });
}

/**
 * Duplicate a template (clones the template shell and its active version).
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates/duplicate-a-transactional-template
 */
export async function duplicateTemplate(templateId: string, name?: string): Promise<SgTemplate> {
  return tmplRequest('POST', `/templates/${templateId}`, name ? { name } : {});
}

/**
 * Permanently delete a template and all its versions.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates/delete-a-template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  await tmplRequest('DELETE', `/templates/${templateId}`);
}

// ─── Version CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new version for a template.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates-versions-unsubscribe-actions/create-a-new-transactional-template-version
 */
export async function createTemplateVersion(
  templateId: string,
  versionData: SgTemplateVersionData,
): Promise<SgTemplateVersion> {
  return tmplRequest('POST', `/templates/${templateId}/versions`, versionData as unknown as Record<string, unknown>);
}

/**
 * Update a version's name, subject, HTML or plain content.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates-versions-unsubscribe-actions/edit-a-transactional-template-version
 */
export async function updateTemplateVersion(
  templateId: string,
  versionId: string,
  versionData: Partial<SgTemplateVersionData>,
): Promise<SgTemplateVersion> {
  return tmplRequest(
    'PATCH',
    `/templates/${templateId}/versions/${versionId}`,
    versionData as unknown as Record<string, unknown>,
  );
}

/**
 * Activate a version — makes it the live version referenced when sending with this templateId.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates-versions-unsubscribe-actions/activate-a-transactional-template-version
 */
export async function activateTemplateVersion(templateId: string, versionId: string): Promise<SgTemplateVersion> {
  return tmplRequest('POST', `/templates/${templateId}/versions/${versionId}/activate`);
}

/**
 * Permanently delete a template version.
 * Docs: https://docs.sendgrid.com/api-reference/transactional-templates-versions-unsubscribe-actions/delete-a-transactional-template-version
 */
export async function deleteTemplateVersion(templateId: string, versionId: string): Promise<void> {
  await tmplRequest('DELETE', `/templates/${templateId}/versions/${versionId}`);
}
