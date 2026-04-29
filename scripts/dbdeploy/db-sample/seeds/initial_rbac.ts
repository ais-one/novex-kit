/**
 * RBAC seed — populates tenants, roles, permissions and user-role assignments
 * that mirror the seed users in initial_users.ts.
 *
 * Prerequisites
 * ─────────────
 * 1. The RBAC tables must exist (run migration 20260416000001_rbac_tables).
 * 2. The users table must already be populated (run initial_users seed first).
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
  userTenantRoles,
} from '../../../../common/compiled/node/services/db/schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  // ── 1. Clean up in reverse FK order ────────────────────────────────────────
  await db.delete(userTenantRoles);
  await db.delete(rolePermissions);
  await db.delete(roles);
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

  // ── 4. Roles (scoped to tenant 1) ───────────────────────────────────────────
  await db.insert(roles).values([
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
    { user_id: 1, tenant_id: 1, role_id: 1 },
    { user_id: 2, tenant_id: 1, role_id: 2 },
    { user_id: 3, tenant_id: 1, role_id: 3 },
    { user_id: 3, tenant_id: 1, role_id: 1 },
  ]);

  console.log('RBAC: seeded 1 tenant, 4 permissions, 3 roles, 4 user-role assignments');
}
