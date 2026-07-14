/**
 * RBAC seed — populates tenants, tenant_roles, permissions, role_permissions
 * and user_tenant_roles in db-iam.
 *
 * User IDs reference the stable test UUIDs created by initial_iam_users.ts,
 * which must run first.
 *
 * Prerequisites
 * ─────────────
 * 1. The RBAC tables must exist (run migration 0001_rbac_fga).
 * 2. initial_iam_users seed must have run (to satisfy the FK on user_tenant_roles).
 */
// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { permissions, rolePermissions, tenantRoles, tenants, userTenantRoles } from '../schema.ts';
import { TEST_USER_IDS } from './initial_iam_users.ts';

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  // ── 1. Clean up in reverse FK order ────────────────────────────────────────
  await db.delete(userTenantRoles);
  await db.delete(rolePermissions);
  await db.delete(tenantRoles);
  await db.delete(permissions);
  await db.delete(tenants);

  // ── 2. Tenants ──────────────────────────────────────────────────────────────
  await db.insert(tenants).values([{ id: 1, name: 'Default', slug: 'default', is_active: true }]);

  // ── 3. Permissions ──────────────────────────────────────────────────────────
  await db.insert(permissions).values([
    { id: 1, name: 'users:read', description: 'Read user records' },
    { id: 2, name: 'users:write', description: 'Create and update users' },
    { id: 3, name: 'reports:read', description: 'View reports' },
    { id: 4, name: 'reports:export', description: 'Export report data' },
  ]);

  // ── 4. Tenant roles (scoped to tenant 1) ────────────────────────────────────
  await db.insert(tenantRoles).values([
    { id: 1, tenant_id: 1, name: 'TestGroup', description: 'Standard group role' },
    { id: 2, tenant_id: 1, name: 'TestGithub', description: 'GitHub SSO users' },
    { id: 3, tenant_id: 1, name: 'TestGmail', description: 'Gmail SSO users' },
  ]);

  // ── 5. Role → permission grants ─────────────────────────────────────────────
  await db.insert(rolePermissions).values([
    { role_id: 1, permission_id: 1 },
    { role_id: 1, permission_id: 3 },
    { role_id: 2, permission_id: 1 },
    { role_id: 3, permission_id: 1 },
    { role_id: 3, permission_id: 3 },
    { role_id: 3, permission_id: 4 },
  ]);

  // ── 6. User → tenant → role assignments ────────────────────────────────────
  await db.insert(userTenantRoles).values([
    { user_id: TEST_USER_IDS.test, tenant_id: 1, role_id: 1 },
    { user_id: TEST_USER_IDS['ais-one'], tenant_id: 1, role_id: 2 },
    { user_id: TEST_USER_IDS.aaronjxz, tenant_id: 1, role_id: 3 },
    { user_id: TEST_USER_IDS.aaronjxz, tenant_id: 1, role_id: 1 },
  ]);

  console.log('RBAC: seeded 1 tenant, 4 permissions, 3 tenant-roles, 4 user-role assignments');
}
