// WhatsApp Business — Template Management API
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-management-api/message-templates
//
// These calls use the WhatsApp Business Account ID (WABA ID), not the phone number ID.
// Required token scope: whatsapp_business_management
//
// Required env vars to pass in from your route/service:
//   process.env.WHATSAPP_TOKEN
//   process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

import type { WaTemplateComponent, WaTemplateCreate, WaTemplateSummary, WaTemplateUpdate } from './types.ts';

export type { WaTemplateComponent, WaTemplateCreate, WaTemplateSummary, WaTemplateUpdate };

const API_VERSION = 'v25.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function tmplRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as { error?: { message: string; code: number; type: string } } & T;

  if (!res.ok || data.error) {
    const e = data.error;
    throw new Error(
      `[WA Template API] ${e?.type ?? 'Error'} (${e?.code ?? res.status}): ${e?.message ?? 'Unknown error'}`,
    );
  }

  return data;
}

// ─── List all templates for a WABA ───────────────────────────────────────────

export async function listTemplates(
  token: string,
  wabaId: string,
  opts: { limit?: number; status?: string } = {},
): Promise<{ data: WaTemplateSummary[]; paging?: { cursors: { before: string; after: string }; next?: string } }> {
  const params = new URLSearchParams();
  params.set('fields', 'id,name,status,category,language,components,quality_score,rejected_reason');
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.status) params.set('status', opts.status);

  return tmplRequest('GET', `/${wabaId}/message_templates?${params}`, token);
}

// ─── Create a template ────────────────────────────────────────────────────────

export async function createTemplate(
  token: string,
  wabaId: string,
  payload: WaTemplateCreate,
): Promise<{ id: string; status: string; category: string }> {
  return tmplRequest('POST', `/${wabaId}/message_templates`, token, payload as unknown as Record<string, unknown>);
}

// ─── Update a template ────────────────────────────────────────────────────────

export async function updateTemplate(
  token: string,
  templateId: string,
  payload: WaTemplateUpdate,
): Promise<{ success: boolean }> {
  return tmplRequest('POST', `/${templateId}`, token, payload as unknown as Record<string, unknown>);
}

// ─── Delete a template ────────────────────────────────────────────────────────

export async function deleteTemplate(token: string, wabaId: string, name: string): Promise<{ success: boolean }> {
  return tmplRequest('DELETE', `/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, token);
}
