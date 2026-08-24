# Authorization — RBAC and FGA

This project supports two composable authorization layers on top of JWT authentication:

| Layer | Module | Purpose |
|---|---|---|
| **RBAC** | `common/compiled/node/auth/rbac.ts` | Tenant-scoped roles and permissions stored in the DB |
| **FGA** | `common/compiled/node/auth/openfga.ts` | Fine-grained per-object checks via OpenFGA |

Both are optional. They can be used independently or together.

---

## How it works

### JWT payload

```json
{
  "iss": "https://api.example.com",
  "sub": 3,
  "aud": "https://app.example.com",
  "scope": "openid profile email",
  "roles": ["admin", "member"],
  "tenant_id": 1,
  "tenant_plan": "pro"
}
```

- `iss` — issuer; configured via `JWT_ISS` in `.env.json`, defaults to empty string.
- `sub` — user ID.
- `aud` — audience; configured via `JWT_AUD` in `.env.json`, defaults to empty string.
- `scope` — space-separated scopes; configured via `JWT_SCOPE` in `.env.json`.
- `roles` — coarse-grained flat array; source depends on the active tier (see below).
- `tenant_id` — the user's active tenant from RBAC; absent when RBAC is not configured.
- `tenant_plan` — the tenant's plan/tier for feature gating without a per-request DB call.
- Fine-grained permissions are **not embedded** — resolved at request time via `rbac.getUserTenantsData`.

### Roles fallback chain (`createToken`)

`getActiveTenant` is always called first. The JWT `roles` array is populated via a three-tier fallback — each tier only consulted if the previous yields nothing:

1. **RBAC** — roles from `user_tenant_roles` for the active tenant.
2. **FGA** — roles from OpenFGA `ListObjects` (only if RBAC yields no roles).
3. **Legacy** — flat `users.roles` DB column (only if FGA also yields nothing).

The `roles` format is identical regardless of source — consumers are unaware which tier was used.

The legacy `users.roles` column is populated by your app's user management (registration, admin tools). It is the fallback for deployments where neither RBAC nor FGA is configured — once RBAC is active it is bypassed entirely.

### `authUser` middleware

After JWT verification, `authUser` attaches helpers to every authenticated request:

```js
req.user  // decoded JWT payload { sub, roles, tenant_id, tenant_plan, iat, exp }
req.rbac  // { hasRole(...roles) }  — checks flat JWT roles array
req.fga   // { check(relation, object) } — ad-hoc OpenFGA check
```

For fine-grained permission checks use `getUserTenantsData` with `req.user.tenant_id`:

```js
import { getUserTenantsData } from '@common/node/auth/rbac.js';

const data = await getUserTenantsData(req.user.sub, req.user.tenant_id);
// data.tenants[req.user.tenant_id].permissions → string[]
```

---

## Mode selection

| Mode | Config |
|---|---|
| RBAC only | `RBAC_CONFIG.enabled: true`, FGA `storeId` empty |
| FGA only | `RBAC_CONFIG.enabled: false`, FGA `storeId` set |
| Both | Both enabled — RBAC roles take precedence; FGA used for per-object checks |
| Neither (legacy) | Both disabled — uses flat `users.roles` column |

| Use case | Recommendation |
|---|---|
| Tenant isolation, coarse role checks | RBAC |
| Per-object ownership or sharing (e.g. "can edit document:42") | FGA |
| Both coarse and fine-grained control | RBAC + FGA together |
| No external service, simple deployments | RBAC only |
| Maximum flexibility, dynamic policies | FGA only or RBAC + FGA |

---

## RBAC

### Data model

```
tenants           id, name, slug, plan, is_active, timestamps
tenant_roles      id, tenant_id→tenants, name, description, timestamps
permissions       id, name (e.g. "users:read"), description, timestamps
role_permissions  (role_id, permission_id) composite PK
user_tenant_roles (user_id, tenant_id, role_id) composite PK
```

Roles are **tenant-scoped**. Permissions are **global**. A user can hold **multiple roles per tenant**. These tables live in the `db/iam` schema (`@db/iam`), not `db/sample` — see [Files](#files) below.

```
tenants
  └── tenant_roles (tenant_id FK)
        └── role_permissions (role_id FK)
              └── permissions

users
  └── user_tenant_roles (user_id, tenant_id, role_id)
```

### Setup

```bash
npm run db:migrate --workspace=db/iam
npm run db:seed --workspace=db/iam
```

This applies all pending `db/iam` migrations and runs every seed file for that schema — including `initial_rbac.ts` and `initial_openfga.ts` below — in order; there's no per-seed selector (unlike the old knex `seed:run --specific=`), see `db/README.md`.

The service also needs `rbac.configure({ tenants, tenantRoles, permissions, rolePermissions, userTenantRoles })` called once at app startup, passing the `db/iam` Drizzle table references, before any RBAC call resolves — see `common/compiled/node/auth/rbac.ts`. Until `configure()` is called, `rbac.isConfigured()` returns `false` and RBAC falls back per the [roles fallback chain](#roles-fallback-chain-createtoken) above.

Enable in `apps/sample-api/.env.json`:

```json
"RBAC_CONFIG": {
  "enabled": true
}
```

### Usage in routes

```js
import { authUser } from '@common/node/auth';
import { requireRole, getUserTenantsData } from '@common/node/auth/rbac';

// Middleware — declarative role check
router.get('/admin', authUser, requireRole('admin'), handler);

// Inline role check
router.get('/dashboard', authUser, async (req, res) => {
  if (!req.rbac.hasRole('admin')) return res.sendStatus(403);
  res.json({ ok: true });
});

// Permission check at request time
router.get('/reports', authUser, async (req, res) => {
  const data = await getUserTenantsData(req.user.sub, req.user.tenant_id);
  if (!data?.tenants[req.user.tenant_id]?.permissions.includes('reports:read')) {
    return res.sendStatus(403);
  }
  res.json({ ok: true });
});
```

### Role and permission management

```js
import { assignRole, revokeRole, grantPermission, revokePermission } from '@common/node/auth/rbac';

await assignRole(userId, tenantId, roleId);
await revokeRole(userId, tenantId, roleId);
await grantPermission(roleId, permissionId);
await revokePermission(roleId, permissionId);
```

### Seed data (`initial_rbac.js`)

| Tenant | Role | Permissions |
|---|---|---|
| Default (id=1) | TestGroup | `users:read`, `reports:read` |
| Default (id=1) | TestGithub | `users:read` |
| Default (id=1) | TestGmail | `users:read`, `reports:read`, `reports:export` |

| User | Roles in tenant 1 |
|---|---|
| user:1 (test) | TestGroup |
| user:2 (ais-one) | TestGithub |
| user:3 (aaronjxz) | TestGmail, TestGroup |

---

## FGA

Fine-grained authorization using [OpenFGA](https://openfga.dev) — an open-source Zanzibar-based access control system. Enables per-object permission checks and audit-friendly tuple history.

### Authorization model

```
type user

type role
  relations
    define assignee: [user]
```

A user is an "assignee" of a named role object. This mirrors the `users.roles` format so existing role names work unchanged.

Tuples assign users to roles:

| user | relation | object |
|---|---|---|
| user:1 | assignee | role:TestGroup |
| user:2 | assignee | role:TestGithub |
| user:3 | assignee | role:TestGmail |
| user:3 | assignee | role:TestGroup |

### Setup

**1. Start OpenFGA**

```bash
docker run -p 8080:8080 openfga/openfga run
```

**2. Run migration and seed**

```bash
npm run db:migrate --workspace=db/iam
npm run db:seed --workspace=db/iam
```

This runs every seed file for the `db/iam` schema, including `initial_openfga.ts`, which prints the `store_id` and `auth_model_id` it created.

**3. Configure the app**

```json
"FGA_CONFIG": {
  "apiUrl": "http://127.0.0.1:8080",
  "storeId": "<printed store_id>",
  "authorizationModelId": "<printed auth_model_id>"
}
```

### Usage in routes

```js
import { authUser } from '@common/node/auth';
import { requireFga, writeTuple, deleteTuple } from '@common/node/auth/openfga';

// Declarative middleware — static object
router.delete('/users/:id', authUser, requireFga('assignee', 'role:admin'), handler);

// Declarative middleware — dynamic object derived from request
router.put('/docs/:id', authUser, requireFga('owner', req => `document:${req.params.id}`), handler);

// Ad-hoc check inside a handler
router.get('/resource', authUser, async (req, res) => {
  const canEdit = await req.fga.check('writer', 'document:42');
  res.json({ canEdit });
});

// Tuple management
await writeTuple('user:42', 'assignee', 'role:admin');
await deleteTuple('user:42', 'assignee', 'role:admin');
```

### RBAC + FGA together

```js
import { authUser } from '@common/node/auth';
import { requireFga } from '@common/node/auth/openfga';

// Coarse: user must be an admin (JWT roles check)
// Fine:   user must own this specific document (FGA)
router.put(
  '/docs/:id',
  authUser,
  (req, res, next) => req.rbac.hasRole('admin') ? next() : res.sendStatus(403),
  requireFga('owner', req => `document:${req.params.id}`),
  handler,
);
```

### `fga_config` table

Stores the active FGA store and model IDs so they can be read by tooling or admin UIs.

| Column | Type | Description |
|---|---|---|
| `id` | integer PK | |
| `store_id` | string(64) | OpenFGA store ID |
| `auth_model_id` | string(64) | Authorization model ID |
| `label` | string(80) | Human-readable name, default `"default"` |
| `api_url` | string(255) | FGA server URL |
| `is_active` | boolean | Whether this config is in use |
| `created_at` / `updated_at` | timestamp | |

### Seed data (`initial_openfga.js`)

Idempotent — checks for an existing `"sample-app"` store before creating. It:

1. Creates (or reuses) the `"sample-app"` store.
2. Writes the authorization model.
3. Writes tuples mirroring `initial_users.js`.
4. Saves `store_id` and `auth_model_id` to the `fga_config` table.

If the OpenFGA server is unreachable the seed exits gracefully with a warning.

### Production

OpenFGA requires its own persistent store. See the [OpenFGA deployment guide](https://openfga.dev/docs/getting-started/setup-openfga/docker) for options (PostgreSQL, MySQL, in-memory).

Store and model IDs should be managed via a secrets vault and injected as environment variables — do not commit them.

---

## Files

### New files

| File | Purpose |
|---|---|
| `common/compiled/node/auth/rbac.ts` | RBAC service — `configure`, `isConfigured`, `getUserTenantsData`, `requireRole`, `assignRole`, `revokeRole`, `grantPermission`, `revokePermission` |
| `common/compiled/node/auth/openfga.ts` | FGA client wrapper — `setup`, `listUserRoles`, `check`, `writeTuple`, `deleteTuple`, `requireFga` |
| `db/iam/drizzle/*.sql` | Drizzle-generated migrations creating `tenants`, `tenant_roles`, `permissions`, `role_permissions`, `user_tenant_roles`, `fga_config` in the `iam` schema (these tables originally migrated under `db/sample`/knex — see `db/sample/drizzle/0002_remove_rbac_fga.sql`, which drops them from `public` again) |
| `db/iam/seeds/initial_rbac.ts` | Seeds tenant, roles, permissions, user assignments |
| `db/iam/seeds/initial_openfga.ts` | Creates FGA store, model, seed tuples |

### Modified files

| File | Change |
|---|---|
| `common/compiled/node/auth/index.ts` | Extend `setup()`; three-tier roles chain in `createToken`; attach `req.rbac` and `req.fga` in `authUser` |
| `common/compiled/node/express/preRoute.ts` | Read `RBAC_CONFIG` and `FGA_CONFIG`; pass to `authService.setup()` |
| `apps/sample-api/.env.json` | Added `RBAC_CONFIG` and `FGA_CONFIG` blocks |
| `common/compiled/node/package.json` | Added `@openfga/sdk` (currently `^0.9.7`) |
