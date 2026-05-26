// SendGrid v3 Dynamic Templates API — template management helpers
// Docs: https://docs.sendgrid.com/api-reference/transactional-templates/
//
// All functions accept an apiKey as the first parameter.
// The caller is responsible for providing credentials (e.g. from tenant config resolver).

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

async function tmplRequest<T>(
  apiKey: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
 */
export async function listTemplates(
  apiKey: string,
  opts: { pageSize?: number; pageToken?: string } = {},
): Promise<{
  templates: SgTemplate[];
  _metadata?: { self: string; next?: string; prev?: string; count: number };
}> {
  const params = new URLSearchParams({ generations: 'dynamic' });
  if (opts.pageSize) params.set('page_size', String(opts.pageSize));
  if (opts.pageToken) params.set('page_token', opts.pageToken);
  return tmplRequest(apiKey, 'GET', `/templates?${params}`);
}

/**
 * Get a single template with all its versions.
 */
export async function getTemplate(apiKey: string, templateId: string): Promise<SgTemplate> {
  return tmplRequest(apiKey, 'GET', `/templates/${templateId}`);
}

/**
 * Create a new empty dynamic template.
 */
export async function createTemplate(
  apiKey: string,
  name: string,
  generation: 'dynamic' | 'legacy' = 'dynamic',
): Promise<SgTemplate> {
  return tmplRequest(apiKey, 'POST', '/templates', { name, generation });
}

/**
 * Rename an existing template.
 */
export async function updateTemplate(apiKey: string, templateId: string, name: string): Promise<SgTemplate> {
  return tmplRequest(apiKey, 'PATCH', `/templates/${templateId}`, { name });
}

/**
 * Duplicate a template (clones the template shell and its active version).
 */
export async function duplicateTemplate(apiKey: string, templateId: string, name?: string): Promise<SgTemplate> {
  return tmplRequest(apiKey, 'POST', `/templates/${templateId}`, name ? { name } : {});
}

/**
 * Permanently delete a template and all its versions.
 */
export async function deleteTemplate(apiKey: string, templateId: string): Promise<void> {
  await tmplRequest(apiKey, 'DELETE', `/templates/${templateId}`);
}

// ─── Version CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new version for a template.
 */
export async function createTemplateVersion(
  apiKey: string,
  templateId: string,
  versionData: SgTemplateVersionData,
): Promise<SgTemplateVersion> {
  return tmplRequest(
    apiKey,
    'POST',
    `/templates/${templateId}/versions`,
    versionData as unknown as Record<string, unknown>,
  );
}

/**
 * Update a version's name, subject, HTML or plain content.
 */
export async function updateTemplateVersion(
  apiKey: string,
  templateId: string,
  versionId: string,
  versionData: Partial<SgTemplateVersionData>,
): Promise<SgTemplateVersion> {
  return tmplRequest(
    apiKey,
    'PATCH',
    `/templates/${templateId}/versions/${versionId}`,
    versionData as unknown as Record<string, unknown>,
  );
}

/**
 * Activate a version — makes it the live version referenced when sending with this templateId.
 */
export async function activateTemplateVersion(
  apiKey: string,
  templateId: string,
  versionId: string,
): Promise<SgTemplateVersion> {
  return tmplRequest(apiKey, 'POST', `/templates/${templateId}/versions/${versionId}/activate`);
}

/**
 * Permanently delete a template version.
 */
export async function deleteTemplateVersion(apiKey: string, templateId: string, versionId: string): Promise<void> {
  await tmplRequest(apiKey, 'DELETE', `/templates/${templateId}/versions/${versionId}`);
}
