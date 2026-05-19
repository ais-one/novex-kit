## Description

This workspace contains all database migration and seed tooling for the project. It manages one shared PGlite database with three PostgreSQL schemas:

- **public** (`db-sample`) — the main application database (used by `apps/sample-api`)
- **iam** (`db-iam`) — identity and access management tables
- **audit** (`db-audit`) — audit log and hard-delete log tables

All three schemas share a single PGlite socket server on port **5432**. Migration and seeding uses **drizzle-orm** / **drizzle-kit** with per-schema `drizzle.config.ts` files.

---

## Quick Start (local dev)

Run all commands from `scripts/dbdeploy/`.

### 1. Start the local database server

```powershell
npm run serve
```

This starts a single PGlite socket server on `127.0.0.1:5432` serving all three schemas (`public`, `iam`, `audit`). Leave this terminal open while running migrations or seeding.

### 2. Run migrations (in order)

```powershell
# 1. public schema (must run first — audit triggers depend on public.users)
npm run db:migrate

# 2. iam schema
npm run db:iam:migrate

# 3. audit schema (must run after db:migrate — 0001_public_triggers depends on public.users)
npm run db:audit:migrate
```

### 3. Seed initial data

```powershell
# db-sample (users, RBAC, test data, OpenFGA config)
npm run db:seed

# db-iam (system users and roles)
npm run db:iam:seed

# db-audit (no-op — audit tables are append-only, no seed data needed)
npm run db:audit:seed
```

---

## All Scripts

| Script | What it does |
|---|---|
| `npm run serve` | Start PGlite on 5432 (public + iam + audit schemas) |
| `npm run db:migrate` | Apply pending db-sample (public) migrations |
| `npm run db:generate` | Generate new db-sample migration from schema changes |
| `npm run db:seed` | Run all db-sample seed files in order |
| `npm run db:studio` | Open Drizzle Studio for db-sample |
| `npm run db:iam:migrate` | Apply pending db-iam migrations |
| `npm run db:iam:generate` | Generate new db-iam migration from schema changes |
| `npm run db:iam:seed` | Run all db-iam seed files in order |
| `npm run db:iam:studio` | Open Drizzle Studio for db-iam |
| `npm run db:audit:migrate` | Apply pending db-audit migrations |
| `npm run db:audit:generate` | Generate new db-audit migration from schema changes |
| `npm run db:audit:seed` | Run db-audit seed (no-op placeholder) |
| `npm run db:audit:studio` | Open Drizzle Studio for db-audit |

---

## Reverting and Retesting Migrations

PGlite stores its data in a single file (`db-sample/dev.db`). To reset to a clean slate:

```powershell
# Stop serve first (Ctrl+C), then delete the db file
Remove-Item -Recurse -Force db-sample/dev.db
```

Then restart and rerun migrations in order:

```powershell
npm run serve             # in a separate terminal

npm run db:migrate        # public schema
npm run db:seed           # seed public

npm run db:iam:migrate    # iam schema
npm run db:iam:seed       # seed iam

npm run db:audit:migrate  # audit schema (after public)
```

---

## Folder Structure

```
scripts/dbdeploy/
├── serve-db.ts                  # starts single PGlite socket server on 5432
├── package.json
├── db-sample/                   # public schema
│   ├── .env                     # local DATABASE_URL (gitignored)
│   ├── .gitignore
│   ├── drizzle.config.ts        # schemaFilter: ['public']
│   ├── seed.ts                  # seed runner
│   ├── drizzle/
│   │   ├── 0000_left_ben_grimm.sql          # all CREATE TABLE statements
│   │   ├── 0001_functions_and_triggers.sql  # PL/pgSQL functions + triggers
│   │   ├── 0002_remove_rbac_fga.sql         # drops RBAC/FGA tables (moved to iam)
│   │   ├── 0003_remove_audit.sql            # drops old audit tables (moved to audit schema)
│   │   └── meta/_journal.json
│   └── seeds/
│       ├── initial_users.ts
│       ├── initial_rbac.ts
│       ├── initial_testdata.ts
│       └── initial_openfga.ts
├── db-iam/                      # iam schema
│   ├── .env                     # local DATABASE_URL (gitignored)
│   ├── .gitignore
│   ├── drizzle.config.ts        # schemaFilter: ['iam']
│   ├── seed.ts                  # seed runner
│   ├── drizzle/
│   │   ├── 0000_cultured_iron_man.sql  # all iam.* CREATE TABLE statements
│   │   └── meta/_journal.json
│   └── seeds/
│       ├── initial_iam_users.ts
│       ├── initial_roles.ts
│       ├── initial_rbac.ts
│       └── initial_openfga.ts
└── db-audit/                    # audit schema
    ├── .env                     # local DATABASE_URL (gitignored)
    ├── .gitignore
    ├── drizzle.config.ts        # schemaFilter: ['audit']
    ├── seed.ts                  # no-op placeholder
    ├── drizzle/
    │   ├── 0000_audit_tables.sql          # CREATE SCHEMA audit + audit_log + hard_delete_log
    │   ├── 0001_audit_append_only.sql     # enforce_append_only() function + append-only triggers
    │   ├── 0002_public_triggers.sql       # audit_trigger_func() + audit_users trigger on public.users
    │   └── meta/_journal.json
```

---

## Schema Sources

| Schema | Drizzle schema file |
|---|---|
| `public` | `common/compiled/node/services/db/schema.ts` |
| `iam` | `common/compiled/node/services/db-iam/schema.ts` |
| `audit` | `common/compiled/node/services/db-audit/schema.ts` |

---

## Adding a New Migration

1. Modify the relevant schema file (see table above).

2. Generate the migration SQL:
   ```powershell
   npm run db:generate        # public schema
   npm run db:iam:generate    # iam schema
   npm run db:audit:generate  # audit schema
   ```

3. Review the generated SQL file in the schema's `drizzle/` folder.

4. Apply it:
   ```powershell
   npm run db:migrate         # public
   npm run db:iam:migrate     # iam
   npm run db:audit:migrate   # audit
   ```

For raw SQL (triggers, functions, REVOKE/GRANT) that drizzle-kit cannot generate, create a numbered SQL file manually (e.g. `0002_my_trigger.sql`) and add an entry to `drizzle/meta/_journal.json`.

---

## Connection String

| Environment | URL |
|---|---|
| Local dev (PGlite) | `postgresql://postgres:postgres@127.0.0.1:5432/db_express?sslmode=disable` |
| Staging / production (real PostgreSQL) | `postgresql://<user>:<pass>@<host>:5432/<db>` |

The `.env` files in each schema subdirectory contain the local `DATABASE_URL`. drizzle-kit reads it automatically.

> **Note:** Port `5432` is the local PGlite socket server. Real PostgreSQL instances use the standard port `5432`.

---

## Migration Order Dependency

`db-audit/0001_public_triggers.sql` creates a trigger on `public.users`, so **`db:migrate` must run before `db:audit:migrate`**. If you reset the database, always follow the order: public → iam → audit.

| db-iam | `postgresql://postgres:postgres@127.0.0.1:5433/db_iam?sslmode=disable` | `postgresql://<user>:<pass>@<host>:5433/<db>` |

Set `DATABASE_URL` in the respective `.env` file for local use. For CI/production, set `DATABASE_URL` as an environment variable.

