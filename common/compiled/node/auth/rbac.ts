/**
 * DB-backed RBAC service — tenant-scoped roles and permissions.
 *
 * Tables required (created by migration 20260416000001_rbac_tables):
 *   tenants           — registered tenants
 *   roles             — named roles, each scoped to a tenant
 *   permissions       — global permission strings (e.g. "users:read")
 *   role_permissions  — M:N join between roles and permissions
 *   user_tenant_roles — M:N:N join of user × tenant × role
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
import type { NextFunction, Request, Response } from 'express';
import { permissions, rolePermissions, roles, tenants, userTenantRoles } from '../services/db/schema.ts';

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

/** Returns true when the RBAC service has been initialised. */
const isConfigured = () => _lookup !== null;

/**
 * Fetch the user's active tenant for embedding in the JWT.
 * Returns tenant_id, tenant_plan, and the coarse roles held in that tenant.
 */
const getActiveTenant = async (userId: string | number, defaultTenantId?: string | number) => {
  if (!_lookup) return null;
  try {
    const rows = await db()
      .select({
        tenant_id: tenants.id,
        tenant_plan: tenants.plan,
        role_name: roles.name,
      })
      .from(userTenantRoles)
      .innerJoin(tenants, eq(tenants.id, userTenantRoles.tenant_id))
      .innerJoin(roles, eq(roles.id, userTenantRoles.role_id))
      .where(and(eq(userTenantRoles.user_id, Number(userId)), eq(tenants.is_active, true)));

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
const getUserTenantsData = async (userId: string | number, defaultTenantId?: string | number) => {
  if (!_lookup) return null;
  try {
    const rows = await db()
      .select({
        tenant_id: userTenantRoles.tenant_id,
        role_name: roles.name,
        permission_name: permissions.name,
      })
      .from(userTenantRoles)
      .innerJoin(roles, eq(roles.id, userTenantRoles.role_id))
      .innerJoin(tenants, eq(tenants.id, userTenantRoles.tenant_id))
      .leftJoin(rolePermissions, eq(rolePermissions.role_id, roles.id))
      .leftJoin(permissions, eq(permissions.id, rolePermissions.permission_id))
      .where(and(eq(userTenantRoles.user_id, Number(userId)), eq(tenants.is_active, true)));

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
const assignRole = async (userId: number, tenantId: number, roleId: number) => {
  await db()
    .insert(userTenantRoles)
    .values({ user_id: userId, tenant_id: tenantId, role_id: roleId })
    .onConflictDoNothing();
};

/** Revoke a role from a user within a tenant. */
const revokeRole = async (userId: number, tenantId: number, roleId: number) => {
  await db()
    .delete(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.user_id, userId),
        eq(userTenantRoles.tenant_id, tenantId),
        eq(userTenantRoles.role_id, roleId),
      ),
    );
};

/** Grant a permission to a role (idempotent). */
const grantPermission = async (roleId: number, permissionId: number) => {
  await db().insert(rolePermissions).values({ role_id: roleId, permission_id: permissionId }).onConflictDoNothing();
};

/** Revoke a permission from a role. */
const revokePermission = async (roleId: number, permissionId: number) => {
  await db()
    .delete(rolePermissions)
    .where(and(eq(rolePermissions.role_id, roleId), eq(rolePermissions.permission_id, permissionId)));
};

/**
 * Route middleware — requires the user to hold at least one of the given roles.
 */
const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.roles?.some((r: string) => roles.includes(r))) return next();
    return res.sendStatus(403);
  };

export {
  assignRole,
  getActiveTenant,
  getUserTenantsData,
  grantPermission,
  isConfigured,
  requireRole,
  revokePermission,
  revokeRole,
  setup,
};
