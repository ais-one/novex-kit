/**
 * OpenFGA seed — creates the store, writes the authorization model, and
 * populates initial relationship tuples that mirror the seed users in
 * initial_users.ts.
 *
 * Prerequisites
 * ─────────────
 * 1. OpenFGA server must be running and reachable (default: http://127.0.0.1:8080).
 *    Quick start: docker run -p 8080:8080 openfga/openfga run
 * 2. The `fga_config` table must exist (run migration 20260416000000_fga_config).
 */

import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { fgaConfig } from '../../../../common/compiled/node/services/db/schema.ts';

const FGA_API_URL = process.env.FGA_API_URL || 'http://127.0.0.1:8080';

const fgaFetch = async (path: string, method = 'GET', body?: unknown) => {
  const res = await fetch(`${FGA_API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenFGA ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
};

const AUTHORIZATION_MODEL = {
  schema_version: '1.1',
  type_definitions: [
    { type: 'user' },
    {
      type: 'role',
      relations: { assignee: { this: {} } },
      metadata: { relations: { assignee: { directly_related_user_types: [{ type: 'user' }] } } },
    },
  ],
};

const INITIAL_TUPLES = [
  { user: 'user:1', relation: 'assignee', object: 'role:TestGroup' },
  { user: 'user:2', relation: 'assignee', object: 'role:TestGithub' },
  { user: 'user:3', relation: 'assignee', object: 'role:TestGmail' },
  { user: 'user:3', relation: 'assignee', object: 'role:TestGroup' },
];

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  let storeId: string;

  try {
    const { stores = [] } = (await fgaFetch('/stores?page_size=50')) as { stores: Array<{ id: string; name: string }> };
    const existing = stores.find(s => s.name === 'sample-app');

    if (existing) {
      storeId = existing.id;
      console.log(`OpenFGA: using existing store "${existing.name}" (${storeId})`);
    } else {
      const created = (await fgaFetch('/stores', 'POST', { name: 'sample-app' })) as { id: string };
      storeId = created.id;
      console.log(`OpenFGA: created store "sample-app" (${storeId})`);
    }
  } catch (err) {
    console.error('OpenFGA seed skipped — could not reach FGA server:', (err as Error).message);
    console.error('Start OpenFGA with: docker run -p 8080:8080 openfga/openfga run');
    return;
  }

  const { authorization_model_id: authModelId } = (await fgaFetch(
    `/stores/${storeId}/authorization-models`,
    'POST',
    AUTHORIZATION_MODEL,
  )) as { authorization_model_id: string };
  console.log(`OpenFGA: wrote authorization model (${authModelId})`);

  await fgaFetch(`/stores/${storeId}/write`, 'POST', {
    writes: { tuple_keys: INITIAL_TUPLES },
    authorization_model_id: authModelId,
  });
  console.log(`OpenFGA: wrote ${INITIAL_TUPLES.length} tuples`);

  try {
    await db.delete(fgaConfig).where(eq(fgaConfig.label, 'default'));
    await db.insert(fgaConfig).values({
      store_id: storeId,
      auth_model_id: authModelId,
      label: 'default',
      api_url: FGA_API_URL,
      is_active: true,
    });
    console.log('OpenFGA: saved config to fga_config table');
  } catch (err) {
    console.warn('OpenFGA: could not write to fga_config table:', (err as Error).message);
  }
}
