/**
 * DB-backed RBAC service — tenant-scoped roles and permissions.
 *
 * Tables required (in db-iam, migration 0002_rbac_fga):
 *   tenants           — registered tenants
 *   tenant_roles      — named roles, each scoped to a tenant
 *   permissions       — global permission strings (e.g. "users:read")
 *   role_permissions  — M:N join between tenant_roles and permissions
 *   user_tenant_roles — M:N:N join of user × tenant × role (user_id is uuid)
 *
 * This service is optional — when not configured, createToken falls back to
 * the flat DB roles column or FGA as before.
 *
 * Usage:
 *   import * as rbac from '@common/node/auth/rbac.ts';
 *   rbac.setup(() => userService); // call once at startup via auth setup()
 *
 *   // In createToken — fetch tenant/role/permission data to embed in JWT
 *   const data = await rbac.getUserTenantsData(userId, user.tenant_id);
 *
 *   // Management helpers (e.g. admin routes)
 *   await rbac.assignRole(userId, tenantId, roleId);
 *   await rbac.revokeRole(userId, tenantId, roleId);
 *   await rbac.grantPermission(roleId, permissionId);
 *   await rbac.revokePermission(roleId, permissionId);
 */

import { and, eq } from 'drizzle-orm';

// biome-ignore lint/suspicious/noExplicitAny: configurable table references injected by the app
let _permissions: any = null;
// biome-ignore lint/suspicious/noExplicitAny: configurable table references injected by the app
let _rolePermissions: any = null;
// biome-ignore lint/suspicious/noExplicitAny: configurable table references injected by the app
let _tenantRoles: any = null;
// biome-ignore lint/suspicious/noExplicitAny: configurable table references injected by the app
let _tenants: any = null;
// biome-ignore lint/suspicious/noExplicitAny: configurable table references injected by the app
let _userTenantRoles: any = null;

/** Register IAM Drizzle tables. Call once at app startup when RBAC is enabled. */
export const configure = (tables: {
  permissions: unknown;
  rolePermissions: unknown;
  tenantRoles: unknown;
  tenants: unknown;
  userTenantRoles: unknown;
}) => {
  _permissions = tables.permissions;
  _rolePermissions = tables.rolePermissions;
  _tenantRoles = tables.tenantRoles;
  _tenants = tables.tenants;
  _userTenantRoles = tables.userTenantRoles;
};

let _userServiceName: string;
// biome-ignore lint/suspicious/noExplicitAny: lookup returns the underlying drizzle instance
let _lookup: ((name: string) => any) | null = null;

const db = () => _lookup?.(_userServiceName);

import type { TenantEntry, TenantRoleEntry } from './types.ts';

/**
 * Initialise the RBAC service.
 *   userServiceName — service name from SERVICES_CONFIG (e.g. 'drizzle1')
 *   lookup          — services.get — resolves a name to the underlying store instance
 */
// biome-ignore lint/suspicious/noExplicitAny: lookup returns different service instance types (drizzle, redis, keyv)
const setup = (userServiceName: string, lookup: (name: string) => any) => {
  _userServiceName = userServiceName;
  _lookup = lookup;
};

/** Returns true when configure() has been called with all required Drizzle table references. */
export const isConfigured = () => _permissions !== null;

/** Returns true when the RBAC service has been initialised (setup() called). */
const isSetup = () => _lookup !== null;

/**
 * Fetch the user's active tenant for embedding in the JWT.
 * Returns tenant_id, tenant_plan, and the coarse roles held in that tenant.
 */
const getActiveTenant = async (userId: string, defaultTenantId?: string | number) => {
  if (!_lookup) return null;
  try {
    const rows = await db()
      .select({
        tenant_id: _tenants.id,
        tenant_plan: _tenants.plan,
        role_name: _tenantRoles.name,
      })
      .from(_userTenantRoles)
      .innerJoin(_tenants, eq(_tenants.id, _userTenantRoles.tenant_id))
      .innerJoin(_tenantRoles, eq(_tenantRoles.id, _userTenantRoles.role_id))
      .where(and(eq(_userTenantRoles.user_id, userId), eq(_tenants.is_active, true)));

    if (rows.length === 0) return null;

    const map: Record<string, TenantEntry> = {};
    for (const row of rows) {
      const tid = row.tenant_id;
      if (!map[tid]) map[tid] = { tenant_id: tid, tenant_plan: row.tenant_plan ?? null, roles: new Set() };
      map[tid].roles.add(row.role_name);
    }

    const entries = Object.values(map);
    const preferred = entries.find(e => e.tenant_id === Number(defaultTenantId));
    const entry = preferred ?? entries[0];
    return {
      tenant_id: entry.tenant_id,
      tenant_plan: entry.tenant_plan,
      roles: [...entry.roles].sort((a, b) => a.localeCompare(b)),
    };
  } catch (err) {
    logger.error({ err, userId }, 'rbac: getActiveTenant failed');
    return null;
  }
};

/**
 * Fetch all tenant memberships for a user with their roles and resolved permissions.
 */
const getUserTenantsData = async (userId: string, defaultTenantId?: string | number) => {
  if (!_lookup) return null;
  try {
    const rows = await db()
      .select({
        tenant_id: _userTenantRoles.tenant_id,
        role_name: _tenantRoles.name,
        permission_name: _permissions.name,
      })
      .from(_userTenantRoles)
      .innerJoin(_tenantRoles, eq(_tenantRoles.id, _userTenantRoles.role_id))
      .innerJoin(_tenants, eq(_tenants.id, _userTenantRoles.tenant_id))
      .leftJoin(_rolePermissions, eq(_rolePermissions.role_id, _tenantRoles.id))
      .leftJoin(_permissions, eq(_permissions.id, _rolePermissions.permission_id))
      .where(and(eq(_userTenantRoles.user_id, userId), eq(_tenants.is_active, true)));

    if (rows.length === 0) return null;

    const map: Record<string, TenantRoleEntry> = {};
    for (const row of rows) {
      const tid = row.tenant_id;
      if (!map[tid]) map[tid] = { roles: new Set(), permissions: new Set() };
      map[tid].roles.add(row.role_name);
      if (row.permission_name) map[tid].permissions.add(row.permission_name);
    }

    const tenantResult: Record<number, { roles: string[]; permissions: string[] }> = {};
    for (const [tid, data] of Object.entries(map)) {
      tenantResult[Number(tid)] = {
        roles: [...data.roles].sort((a, b) => a.localeCompare(b)),
        permissions: [...data.permissions].sort((a, b) => a.localeCompare(b)),
      };
    }

    const tenantIds = Object.keys(tenantResult).map(Number);
    const active_tenant = tenantIds.includes(Number(defaultTenantId)) ? Number(defaultTenantId) : tenantIds[0];

    return { active_tenant, tenants: tenantResult };
  } catch (err) {
    logger.error({ err, userId }, 'rbac: getUserTenantsData failed');
    return null;
  }
};

/** Assign a role to a user within a tenant (idempotent). */
const assignRole = async (userId: string, tenantId: number, roleId: number) => {
  await db()
    .insert(_userTenantRoles)
    .values({ user_id: userId, tenant_id: tenantId, role_id: roleId })
    .onConflictDoNothing();
};

/** Revoke a role from a user within a tenant. */
const revokeRole = async (userId: string, tenantId: number, roleId: number) => {
  await db()
    .delete(_userTenantRoles)
    .where(
      and(
        eq(_userTenantRoles.user_id, userId),
        eq(_userTenantRoles.tenant_id, tenantId),
        eq(_userTenantRoles.role_id, roleId),
      ),
    );
};

/** Grant a permission to a role (idempotent). */
const grantPermission = async (roleId: number, permissionId: number) => {
  await db().insert(_rolePermissions).values({ role_id: roleId, permission_id: permissionId }).onConflictDoNothing();
};

/** Revoke a permission from a role. */
const revokePermission = async (roleId: number, permissionId: number) => {
  await db()
    .delete(_rolePermissions)
    .where(and(eq(_rolePermissions.role_id, roleId), eq(_rolePermissions.permission_id, permissionId)));
};

export {
  assignRole,
  getActiveTenant,
  getUserTenantsData,
  grantPermission,
  isSetup,
  revokePermission,
  revokeRole,
  setup,
};
