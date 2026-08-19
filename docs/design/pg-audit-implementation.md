# PostgreSQL Audit Implementation Guide

*SOC2 & HIPAA Compliant Audit Trail*  
*Using PostgreSQL Triggers, pgaudit, and Express/Knex.js*
*Soft delete and controlled hard deletes

Version 1.0 · April 2026

---

## 1. Overview

This document describes a complete audit logging architecture for a PostgreSQL-backed application. The solution is designed to meet SOC2 Type II and HIPAA audit requirements with minimal ongoing application code.

The architecture has three principles:

- Database triggers handle all row-level change capture automatically
- Application middleware injects user identity via a single transaction wrapper
- pgaudit covers SELECT and DDL queries that triggers cannot capture

### 1.1 What is a Tenant?

A tenant represents a top-level customer or organisation in a multi-tenant SaaS application. For example, if three companies subscribe to your product — Acme Corp, Globex, and Initech — each is a separate tenant. The tenant ID groups all users and data belonging to that company, allowing audit queries such as "show everything that changed for Acme Corp this month." If your application is single-tenant, remove the `tenant_id` field from all tables and `set_config` calls.

### 1.2 Architecture Summary

#### Workflow

```
┌─────────────────────────┐
│   Incoming request      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│     Auth middleware                 │
│  Populates req.user from JWT        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  auditContext middleware            │
│  Attaches req.dbTransaction helper  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│     Route handler                   │
│   Calls req.dbTransaction()         │
└────────────┬────────────────────────┘
             │
             ├─────────────┐
             ▼             ▼
     ┌─────────────┐  ┌──────────────┐
     │writes to    │  │ audit trigger│
     │ audit_log   │  └──────────────┘
     └─────────────┘       ▲
                           │
                      ┌────┴────────┐
                      │ set_config  │
                      └─────────────┘
```

#### Component Summary

| Component | Purpose |
|---|---|
| `audit_log` table | Stores one row per INSERT or UPDATE on audited tables |
| `hard_delete_log` table | Stores explicit records of hard deletes with an optional reason |
| `audit_registry` table | Documents which tables are audited and why — for auditors |
| `audit_trigger_func()` | Reads SET LOCAL context, writes to `audit_log` |
| `enforce_append_only()` | Blocks UPDATE/DELETE on immutable tables at DB level |
| `enforce_hard_delete_log()` | BEFORE DELETE trigger — snapshots the row to `hard_delete_log`, recording a reason when one is set |
| `auditContext` middleware | Injects user identity into every transaction via `set_config` |
| `hardDelete()` helper | Sets an optional delete reason via `set_config` before deleting |
| pgaudit | Captures SELECT, DDL, and direct DB access — config only |
| `api_role` / `audit_reader` roles | Least-privilege separation — the app can never rewrite its own audit trail; reads are a separate, revocable grant (§1.4) |

### 1.3 Compliance Coverage

| Requirement | Covered by | Standard |
|---|---|---|
| Who changed data | `app_user_id` via `set_config` | SOC2, HIPAA |
| What changed | `old_data` / `new_data` JSONB + `changed_fields` | SOC2, HIPAA |
| When it changed | `changed_at` timestamp | SOC2, HIPAA |
| Read access logging | pgaudit | HIPAA |
| Schema change logging | pgaudit | SOC2 |
| Multi-statement linking | `transaction_id` UUID | SOC2 |
| Tamper protection | Revoked permissions + offsite shipping | SOC2, HIPAA |
| Retention 1 year | S3 Object Lock or CloudWatch | SOC2 |
| Retention 6 years | S3 Object Lock or CloudWatch | HIPAA |

### 1.4 Database Roles

Three Postgres roles appear throughout this guide, referenced by name well before they're all defined. None needs `SUPERUSER` — they're ordinary roles distinguished purely by what's granted to them.

| Role | Used by | Purpose |
|---|---|---|
| `api_role` | The application's own DB connection (`DATABASE_URL` / the Knex pool in §6.1) | Normal CRUD on business tables. Has `UPDATE`/`DELETE` revoked on `audit_log` and all access revoked on `hard_delete_log` (§2.1, §2.2), so the application itself can never rewrite or erase its own audit trail — even a compromised app connection can't cover its tracks. |
| `audit_reader` | Auditors / compliance reviewers only — never the application | Read-only: `SELECT` on `audit_log` and `hard_delete_log`. Created in §2.1. Kept separate from `api_role` so read access to the audit trail can be granted/revoked per person without touching the application's own credentials. |
| The role that runs your migrations (e.g. `postgres`, or a dedicated non-superuser owner role — whichever executes the `CREATE FUNCTION` statements in §3) | Nobody at runtime — relevant only at DDL time | Becomes the **owner** of the `SECURITY DEFINER` trigger functions (`audit_trigger_func()`, `enforce_hard_delete_log()`) simply by virtue of creating them. `SECURITY DEFINER` makes those functions execute with this owner's privileges, which is how they can write to `audit_log`/`hard_delete_log` even though `api_role` has no `INSERT` grant there. No separate `CREATE ROLE` step is needed for this one — just be deliberate about which role runs your migrations, and prefer a role scoped to schema ownership over a true Postgres superuser if your provider allows it (e.g. RDS's `rds_superuser` rather than a real `SUPERUSER`). |

`api_role` is referenced by every `REVOKE ... FROM api_role` in this guide (§2.1) and by the gap-detection query in §9, but is never created elsewhere — provision it first:

```sql
-- The application's own connection role. Adjust LOGIN/PASSWORD/CONNECTION LIMIT to your
-- deployment; the only hard requirement is that this is the role your app's DATABASE_URL
-- actually connects as, since that's what every `REVOKE ... FROM api_role` locks down.
CREATE ROLE api_role LOGIN PASSWORD '<set via your secrets manager, never inline>';

GRANT CONNECT ON DATABASE <your_database> TO api_role;
GRANT USAGE ON SCHEMA public TO api_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO api_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO api_role;

-- DELETE is granted broadly here and then gated per-row by enforce_hard_delete_log() (§3.3,
-- §4.4) — a stricter alternative is to skip this GRANT entirely and instead grant DELETE only
-- on the specific tables in your hard-delete allowlist, so a delete on an unlisted table fails
-- at the permission layer before the trigger ever runs.
GRANT DELETE ON ALL TABLES IN SCHEMA public TO api_role;

-- Lock the audit trail down immediately — restates §2.1/§2.2's REVOKEs here for provisioning
-- order; running them again later (as written in §2) is safe and idempotent.
REVOKE UPDATE, DELETE ON audit_log FROM api_role;
REVOKE ALL ON hard_delete_log FROM api_role;
```

> **Note:** run this before §2's `CREATE TABLE` statements, or re-run the two `REVOKE`s afterward — `GRANT ... ON ALL TABLES IN SCHEMA public` only affects tables that already exist at the time it runs, and `audit_log`/`hard_delete_log` must end up locked down regardless of ordering.

---

## 2. Tables

### 2.1 audit_log

The central audit table. Append-only — UPDATE and DELETE are revoked from all application roles. One row is written per mutating statement by the audit trigger.

```sql
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name      TEXT        NOT NULL,
  operation       TEXT        NOT NULL CHECK (operation IN ('INSERT','UPDATE')),

  -- Application-layer identity (injected via SET LOCAL)
  app_user_id     TEXT,
  tenant_id       TEXT,
  session_id      TEXT,
  transaction_id  UUID,

  -- Database-layer identity
  db_user         TEXT        NOT NULL DEFAULT session_user,
  ip_addr         INET        DEFAULT inet_client_addr(),
  app_name        TEXT        DEFAULT current_setting('application_name', true),

  -- Change data
  old_data        JSONB,
  new_data        JSONB,
  changed_fields  TEXT[]
);

-- Indexes for common audit queries
CREATE INDEX idx_audit_user        ON audit_log (app_user_id,  changed_at DESC);
CREATE INDEX idx_audit_table       ON audit_log (table_name,   changed_at DESC);
CREATE INDEX idx_audit_tenant      ON audit_log (tenant_id,    changed_at DESC);
CREATE INDEX idx_audit_transaction ON audit_log (transaction_id);

-- Append-only: revoke mutating permissions from all application roles
-- (api_role is the application's own connection role — see §1.4 for how it's provisioned)
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM api_role;

-- Dedicated read-only role for auditors — see §1.4
CREATE ROLE audit_reader;
GRANT SELECT ON audit_log TO audit_reader;
```

> **Note:** The `old_data` column can be omitted for low-sensitivity tables to reduce storage. Retain it for tables containing financial records or PHI.

### 2.2 hard_delete_log

Hard deletes are rare and controlled. A `BEFORE DELETE` trigger (`enforce_hard_delete_log()`, see §3.3) snapshots the row and writes to `hard_delete_log` automatically — the same DB-enforced pattern already used for INSERT/UPDATE audit. This closes a gap in relying on application code alone: a raw `DELETE` issued outside the app — a migration, a psql session, a different service sharing the database — previously left no trace at all, since the audit trigger only fires on INSERT/UPDATE. The trigger also records a justification via `app.delete_reason` when the caller sets one, but doesn't require it — a hard delete without a reason is still snapshotted, just with `reason` recorded as `NULL`.

```sql
CREATE TABLE hard_delete_log (
  id            BIGSERIAL    PRIMARY KEY,
  deleted_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  table_name    TEXT         NOT NULL,
  record_id     TEXT         NOT NULL,
  deleted_by    TEXT         NOT NULL,
  reason        TEXT,                  -- optional justification
  deleted_data  JSONB        NOT NULL   -- full row snapshot before deletion
);

-- Nobody inserts directly — only the SECURITY DEFINER trigger function writes here
REVOKE ALL ON hard_delete_log FROM PUBLIC;
GRANT SELECT ON hard_delete_log TO audit_reader;
```

### 2.3 audit_registry

A self-documenting table that records which tables are audited and why. This gives auditors a clear governance map without requiring them to inspect individual table definitions.

The `audit_registry` does not enforce behaviour by itself. The enforcement still comes from the trigger definitions and database permissions. Its purpose is governance and evidence: it lets engineers, auditors, and compliance reviewers quickly answer questions such as which tables are fully audited, which are intentionally append-only, and which are excluded with documented justification.

Use the `audit_mode` values consistently:

- `full`: the table uses the audit trigger and every INSERT or UPDATE should produce an `audit_log` row.
- `append_only`: the table is immutable after insert, usually enforced by `enforce_append_only()`, so the table itself acts as the primary historical record.
- `excluded`: the table is intentionally outside the row-level audit trail, typically because it is high-volume, low-risk, or operationally noisy. Every exclusion should have a clear business reason.

Treat this table as required metadata for change management. Whenever a new table is introduced or its audit strategy changes, update `audit_registry` in the same migration as the trigger or permission change so the documentation stays accurate.

```sql
CREATE TABLE audit_registry (
  table_name    TEXT  PRIMARY KEY,
  audit_mode    TEXT  NOT NULL CHECK (audit_mode IN ('full', 'append_only', 'excluded')),
  reason        TEXT,
  registered_at TIMESTAMPTZ DEFAULT now()
);

-- Example entries
INSERT INTO audit_registry VALUES
  ('orders',        'full',        'Financial records — SOC2'),
  ('users',         'full',        'PII — HIPAA'),
  ('payments',      'full',        'Financial records — SOC2'),
  ('event_log',     'append_only', 'Immutable by design'),
  ('notifications', 'append_only', 'Immutable by design'),
  ('metrics',       'excluded',    'High volume, no PII');
```

---

## 3. Functions

### 3.1 audit_trigger_func()

The core trigger function. It reads the four `set_config` values injected by the Express middleware and writes a row to `audit_log`. For UPDATE operations it also computes the `changed_fields` array so queries can filter by which columns were modified.

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  changed TEXT[];
BEGIN
  -- Compute which columns changed (UPDATE only)
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO changed
    FROM jsonb_each(row_to_json(NEW)::jsonb) n
    JOIN jsonb_each(row_to_json(OLD)::jsonb) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value;
  END IF;

  INSERT INTO audit_log (
    table_name,
    operation,
    app_user_id,
    tenant_id,
    session_id,
    transaction_id,
    old_data,
    new_data,
    changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    current_setting('app.current_user_id',   true),
    current_setting('app.current_tenant_id', true),
    current_setting('app.session_id',        true),
    nullif(current_setting('app.transaction_id', true), '')::uuid,
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb END,
    row_to_json(NEW)::jsonb,
    changed
  );

  RETURN NEW;
END;
$$;
```

> **Note:** `SECURITY DEFINER` means the function runs with the privileges of its owner (typically a superuser), ensuring it can always write to `audit_log` even when the calling role has restricted permissions.

### 3.2 enforce_append_only()

Blocks UPDATE and DELETE on tables that are intended to be immutable. This enforces append-only behaviour at the database level rather than relying on application convention.

```sql
CREATE OR REPLACE FUNCTION enforce_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only — % is not permitted',
    TG_TABLE_NAME, TG_OP;
END;
$$;
```

### 3.3 enforce_hard_delete_log()

Runs `BEFORE DELETE` on any table where hard deletes are permitted. It requires `app.delete_reason` to be set for the transaction — set by the `hardDelete()` helper — and raises an exception if it is missing or empty, blocking the delete. Otherwise it snapshots the row into `hard_delete_log` and lets the delete proceed.

```sql
CREATE OR REPLACE FUNCTION enforce_hard_delete_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_by TEXT := COALESCE(
        NULLIF(current_setting('app.current_user_id', true), ''),
        current_user
    );

    reason TEXT := COALESCE(
        NULLIF(current_setting('app.delete_reason', true), ''),
        'Manual SQL delete'
    );
BEGIN
    INSERT INTO hard_delete_log (
        table_name,
        record_id,
        deleted_by,
        reason,
        deleted_data
    ) VALUES (
        TG_TABLE_NAME,
        OLD.id::text,
        deleted_by,
        reason,
        row_to_json(OLD)::jsonb
        -- TODO : for sql user, make new column
        -- TODO : does delete must go to audit_log as well?
    );

    RETURN OLD;
END;
$$;
```

> **Note:** Like `audit_trigger_func()`, this reads a `SET LOCAL` GUC set by the app, and `SECURITY DEFINER` lets it write to `hard_delete_log` even though INSERT is not granted to any application role. Assumes an `id` primary key column — adjust `OLD.id` if a table uses a different key. `reason` is optional — a hard delete proceeds and is still snapshotted even when `app.delete_reason` is unset, so this no longer blocks the delete.

---

## 4. Triggers

### 4.1 Mutable Tables — Audit Trigger

Attach to every table that can be created or updated. Do not include DELETE — soft deletes are captured as UPDATE operations automatically.

```sql
-- Repeat for each table that requires auditing
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Register each table in the audit_registry
INSERT INTO audit_registry (table_name, audit_mode, reason) VALUES
  ('orders',   'full', 'Financial records — SOC2'),
  ('users',    'full', 'PII — HIPAA'),
  ('payments', 'full', 'Financial records — SOC2')
ON CONFLICT (table_name) DO NOTHING;
```

Keeping these rows beside the trigger creation is important. It ensures the control implementation and the governance record are created together, which avoids a common audit gap where the database is configured correctly but the evidence table is incomplete or stale.

### 4.2 Soft Delete Behaviour

No additional trigger is required for soft deletes. A soft delete is an UPDATE that sets a `deleted_at` timestamp. The audit trigger fires on all UPDATE operations, so the deletion is captured automatically with the full before and after snapshot.

```sql
-- This UPDATE fires the audit trigger automatically
-- audit_log records: operation=UPDATE, changed_fields=['deleted_at'], new_data={...}
UPDATE orders SET deleted_at = now() WHERE id = 123;
```

### 4.3 Append-Only Tables — Immutability Trigger

Attach to tables that should never be modified after insert. This enforces the immutability guarantee at the database level and means no audit trigger is needed — the rows themselves are the audit trail.

```sql
CREATE TRIGGER enforce_append_only_event_log
  BEFORE UPDATE OR DELETE ON event_log
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

CREATE TRIGGER enforce_append_only_notifications
  BEFORE UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

-- Register in the audit_registry
INSERT INTO audit_registry (table_name, audit_mode, reason) VALUES
  ('event_log',     'append_only', 'Immutable by design'),
  ('notifications', 'append_only', 'Immutable by design')
ON CONFLICT (table_name) DO NOTHING;
```

For append-only tables, the registry entry explains why there is no row-level UPDATE audit trigger. That distinction matters during reviews because the absence of an audit trigger is intentional, not an oversight.

### 4.4 Hard-Deletable Tables — Hard Delete Trigger

Attach to any table where hard deletes are permitted, in addition to its regular audit trigger from §4.1. The two triggers are independent: `audit_trigger_func()` covers INSERT/UPDATE, `enforce_hard_delete_log()` covers DELETE.

```sql
CREATE TRIGGER hard_delete_users
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_hard_delete_log();

-- Note the hard-delete guard alongside the existing 'full' registry entry
UPDATE audit_registry
SET reason = reason || ' — hard delete guarded by trigger'
WHERE table_name = 'users';
```

Because the trigger runs on every row DELETE fires against, a bulk statement like `DELETE FROM users WHERE tenant_id = ...` is snapshotted per row, and cascading deletes from a `ON DELETE CASCADE` foreign key are captured on the child table too — each row picks up whatever `app.delete_reason` is set for the transaction, or `NULL` if none was set. A raw `DELETE` run outside `req.dbTransaction()` — psql, a migration, a different service — is now captured in `hard_delete_log` (with `reason` `NULL`) instead of silently skipping the audit trail entirely.

---

## 5. Configuration

### 5.1 pgaudit — postgresql.conf

pgaudit captures what triggers cannot: SELECT queries, DDL statements, and any SQL executed by direct database connections that bypass the application layer. Set once and it requires no ongoing maintenance.

```ini
# postgresql.conf

# Load pgaudit on startup
shared_preload_libraries = 'pgaudit'

# Log reads, writes, and schema changes
pgaudit.log = 'read, write, ddl'

# Include table name per statement
pgaudit.log_relation = on

# Include bind parameter values
pgaudit.log_parameter = on

# Structured CSV format — easier to ship to S3 or CloudWatch
log_destination = 'csvlog'

# Recommended: log only statements that complete (not every bind)
log_min_duration_statement = 0
```

> **Note:** pgaudit must be installed as a PostgreSQL extension before enabling it. On RDS, Aurora, and Supabase it is pre-installed. Run: `CREATE EXTENSION pgaudit;`

### 5.2 Offsite Log Shipping and Retention

| Destination | Notes |
|---|---|
| AWS S3 + Object Lock | Set retention lock to 365 days (SOC2) or 2190 days (HIPAA 6yr). Use COMPLIANCE mode for strongest tamper protection. |
| AWS CloudWatch Logs | Built-in integration with RDS/Aurora. Set log group retention policy directly in CloudWatch. |
| Grafana Loki | Lightweight self-hosted option. Pair with Promtail to tail PostgreSQL CSV logs. |
| Datadog | Managed, supports structured log parsing and alerting out of the box. |

---

## 6. Application Code

Only two files are required. Everything else in the application uses `req.dbTransaction()` as a drop-in replacement for direct database calls.

### 6.1 Knex Instance — src/db/knex.js

```js
// src/db/knex.js
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 }
});
```

### 6.2 Audit Context Middleware — src/middleware/auditContext.js

This middleware attaches a `dbTransaction` helper to every request. The helper opens a Knex transaction and immediately sets four session-local variables that the audit trigger reads. The variables are scoped to the transaction and cleared automatically on commit or rollback — they never leak between requests.

```js
// src/middleware/auditContext.js
import { v4 as uuidv4 } from 'uuid';

export function auditContext(db) {
  return async (req, res, next) => {

    // Adapt these to match your auth middleware output
    const userId    = req.user?.id         ?? null;
    const tenantId  = req.user?.tenantId   ?? null; // remove if single-tenant
    const sessionId = req.headers['x-request-id']
                   ?? req.sessionID
                   ?? null;

    req.dbTransaction = (callback) =>
      db.transaction(async (trx) => {

        // One UUID links all audit_log rows from this transaction together
        const txId = uuidv4();

        // set_config with true = SET LOCAL
        // Scoped to this transaction — clears on commit or rollback
        await trx.raw(`
          SELECT
            set_config('app.current_user_id',   ?, true),
            set_config('app.current_tenant_id', ?, true),
            set_config('app.session_id',        ?, true),
            set_config('app.transaction_id',    ?, true)
        `, [userId ?? '', tenantId ?? '', sessionId ?? '', txId]);

        return callback(trx);
      });

    next();
  };
}
```

### 6.3 Wiring Up — src/app.js

```js
// src/app.js
import express from 'express';
import { db } from './db/knex.js';
import { authMiddleware } from './middleware/auth.js';
import { auditContext }   from './middleware/auditContext.js';

const app = express();

app.use(express.json());
app.use(authMiddleware);   // must run first — populates req.user
app.use(auditContext(db)); // attaches req.dbTransaction

export default app;
```

### 6.4 Route Examples

#### Single statement

```js
app.patch('/orders/:id', async (req, res) => {
  const result = await req.dbTransaction(async (trx) => {
    return trx('orders')
      .where({ id: req.params.id })
      .update({ status: req.body.status })
      .returning('*');
  });
  res.json(result[0]);
});
```

#### Multiple statements — linked by transaction_id

All `audit_log` rows produced within one `req.dbTransaction` call share the same `transaction_id` UUID, allowing you to reconstruct exactly what changed atomically.

```js
app.post('/orders/:id/confirm', async (req, res) => {
  const result = await req.dbTransaction(async (trx) => {

    const [order] = await trx('orders')
      .where({ id: req.params.id })
      .update({ status: 'confirmed' })
      .returning('*');

    await trx('inventory')
      .where({ id: order.item_id })
      .update({ quantity: trx.raw('quantity - 1') });

    // event_log is append-only — INSERT only, no audit trigger needed
    await trx('event_log').insert({
      order_id: order.id,
      event:    'confirmed'
    });

    return order;
  });
  res.json(result);
});
```

### 6.5 Hard Delete Helper — src/db/hardDelete.js

The snapshot and log write now happen in `enforce_hard_delete_log()` (§3.3), not in application code. The helper's only job is to set the reason for the transaction, if one was given, before issuing the delete — the trigger records it on the `hard_delete_log` row it writes but never blocks the delete for lacking one.

```js
// src/db/hardDelete.js
export async function hardDelete(trx, tableName, recordId, reason) {
  // set_config with true = SET LOCAL — read by enforce_hard_delete_log()
  // Scoped to this transaction — clears on commit or rollback
  await trx.raw(`SELECT set_config('app.delete_reason', ?, true)`, [reason ?? '']);

  const deletedCount = await trx(tableName).where({ id: recordId }).delete();
  if (!deletedCount) throw new Error(`Record ${recordId} not found in ${tableName}`);
}
```

```js
// Route using the hard delete helper
app.delete('/users/:id', async (req, res) => {
  await req.dbTransaction(async (trx) => {
    await hardDelete(trx, 'users', req.params.id, req.body.reason);
  });
  res.sendStatus(204);
});
```

---

## 7. Ongoing Discipline

The audit system is set-and-forget. The only recurring tasks when adding new tables or features are:

| Task | Action required |
|---|---|
| New mutable table | Attach audit trigger + insert row in `audit_registry` |
| New append-only table | Attach `enforce_append_only` trigger + insert row in `audit_registry` |
| New hard-deletable table | Attach `enforce_hard_delete_log` trigger (§4.4) + note it in `audit_registry` |
| New write route | Use `req.dbTransaction()` — no other change needed |
| Hard delete needed | Use `hardDelete()` helper, optionally with a documented reason — the trigger logs it when given |
| New tenant field on user | Update `auditContext.js` to read the new field |

> **Note:** Do not export the `db` instance directly into route files. Keeping all writes behind `req.dbTransaction` ensures the audit context is always set.

> **Note:** Think of `audit_registry` as the audit coverage inventory. Auditors often ask for a list of in-scope tables and their control type before they inspect raw audit rows. Maintaining this table makes that answer immediate.

---

## 8. Querying the Audit Log

```sql
-- All changes made by a specific user
SELECT table_name, operation, changed_fields, changed_at
FROM audit_log
WHERE app_user_id = 'user-123'
ORDER BY changed_at DESC;

-- Everything that changed in one atomic transaction
SELECT table_name, operation, changed_fields, new_data
FROM audit_log
WHERE transaction_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY changed_at;

-- All changes to a specific record
SELECT operation, changed_fields, old_data, new_data, app_user_id, changed_at
FROM audit_log
WHERE table_name = 'orders'
  AND (new_data->>'id')::int = 456
ORDER BY changed_at;

-- All soft deletes in the last 30 days
SELECT app_user_id, new_data->>'id' AS record_id, changed_at
FROM audit_log
WHERE table_name = 'orders'
  AND operation = 'UPDATE'
  AND 'deleted_at' = ANY(changed_fields)
  AND changed_at > now() - interval '30 days';

-- All hard deletes
SELECT table_name, record_id, deleted_by, reason, deleted_at
FROM hard_delete_log
ORDER BY deleted_at DESC;
```

## 9 . Gap Detection

You can cross-reference it against actual triggers to find tables that have a trigger but aren't registered, or are registered but missing a trigger:

````sql
-- Tables with a trigger but not in the registry (forgot to register)
SELECT event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_%'
  AND event_object_table NOT IN (SELECT table_name FROM audit_registry);

-- Tables registered as 'full' but missing the trigger (trigger was dropped)
SELECT table_name
FROM audit_registry
WHERE audit_mode = 'full'
  AND table_name NOT IN (
    SELECT event_object_table
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'audit_%'
  );

-- Tables where DELETE is granted to api_role (see §1.4) but have no hard_delete_log trigger
-- (a raw DELETE would succeed with zero audit trail)
SELECT table_name
FROM information_schema.role_table_grants
WHERE grantee = 'api_role'
  AND privilege_type = 'DELETE'
  AND table_name NOT IN (
    SELECT event_object_table
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'hard_delete_%'
  );
```