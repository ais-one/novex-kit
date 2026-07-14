## Description

`db/` holds all database schema, migration, and seed code for the project, kept separate from `apps/` and `common/` since this is userland data code that consuming applications import from, not template-owned code. It's organized as one npm workspace per PostgreSQL schema, plus a shared server:

- **`db/sample`** (`@db/sample`) — public schema, the main application database (used by `apps/sample-api`, `apps/cron`)
- **`db/iam`** (`@db/iam`) — identity and access management tables
- **`db/audit`** (`@db/audit`) — audit log and hard-delete log tables
- **`db/` itself** (`@db/core`) — not a schema; just the shared PGlite server (`serve-db.ts`) and its data file (`dev.db`)

All three schemas share the one PGlite socket server on port **5432**, run from `db/` itself. Migration and seeding uses **drizzle-orm** / **drizzle-kit** with per-schema `drizzle.config.ts` files, colocated with each schema's `schema.ts`.

---

## Quick Start (local dev)

Run everything from `db/` — the server, and migration/seed commands (which `cd` into the relevant schema subfolder via their own npm scripts).

### 1. Start the local database server

```bash
npm run serve
```

This starts a single PGlite socket server on `127.0.0.1:5432` serving all three schemas (`public`, `iam`, `audit`), backed by `db/dev.db`. Leave this terminal open while running migrations or seeding.

### 2. Run migrations (in order)

Each schema (`sample`, `iam`, `audit`) is its own workspace with the same script names (`db:migrate`, `db:generate`, `db:seed`, `db:studio`) — run them via `--workspace`, from `db/` or the repo root:

```bash
# 1. public schema (must run first — audit triggers depend on public.users)
npm run db:migrate --workspace=db/sample

# 2. iam schema
npm run db:migrate --workspace=db/iam

# 3. audit schema (must run after db/sample — 0002_public_triggers depends on public.users)
npm run db:migrate --workspace=db/audit
```

Equivalently, `cd` into the schema folder and drop the `--workspace` flag, e.g. `cd sample && npm run db:migrate`.

### 3. Seed initial data

```bash
# sample (users, RBAC, test data, OpenFGA config)
npm run db:seed --workspace=db/sample

# iam (system users and roles)
npm run db:seed --workspace=db/iam

# audit (no-op — audit tables are append-only, no seed data needed)
npm run db:seed --workspace=db/audit
```

---

## All Scripts

| Script | What it does |
|---|---|
| `npm run serve` (from `db/`) | Start PGlite on 5432 (public + iam + audit schemas) |
| `npm run db:migrate --workspace=db/<schema>` | Apply pending migrations for that schema |
| `npm run db:generate --workspace=db/<schema>` | Generate a new migration from schema changes |
| `npm run db:seed --workspace=db/<schema>` | Run all seed files for that schema, in order |
| `npm run db:studio --workspace=db/<schema>` | Open Drizzle Studio for that schema |

Where `<schema>` is `sample`, `iam`, or `audit`.

---

## Reverting and Retesting Migrations

PGlite stores its data in a single file (`db/dev.db`). To reset to a clean slate:

```bash
# Stop serve first (Ctrl+C), then delete the db file, from db/
rm -rf dev.db
```

Then restart and rerun migrations in order:

```bash
# in a separate terminal, from db/
npm run serve

npm run db:migrate --workspace=db/sample        # public schema
npm run db:seed --workspace=db/sample           # seed public

npm run db:migrate --workspace=db/iam    # iam schema
npm run db:seed --workspace=db/iam       # seed iam

npm run db:migrate --workspace=db/audit  # audit schema (after public)
```

---

## Folder Structure

```
db/
├── package.json                  # @db/core — just the shared PGlite server
├── serve-db.ts                   # starts single PGlite socket server on 5432
├── dev.db/                       # PGlite data file (gitignored)
├── sample/                      # public schema
│   ├── schema.ts                 # Drizzle schema (source of truth)
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
├── iam/                          # iam schema
│   ├── schema.ts                 # Drizzle schema (source of truth)
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
└── audit/                        # audit schema
    ├── schema.ts                 # Drizzle schema (source of truth)
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

| Schema | Drizzle schema file | Import (from apps) |
|---|---|---|
| `public` | `db/sample/schema.ts` | `@db/sample/schema` |
| `iam` | `db/iam/schema.ts` | `@db/iam/schema` |
| `audit` | `db/audit/schema.ts` | `@db/audit/schema` |

---

## Adding a New Migration

1. Modify the relevant schema file (see table above).

2. Generate the migration SQL:
   ```bash
   npm run db:generate --workspace=db/sample  # public schema
   npm run db:generate --workspace=db/iam     # iam schema
   npm run db:generate --workspace=db/audit   # audit schema
   ```

3. Review the generated SQL file in the schema's `drizzle/` folder.

4. Apply it:
   ```bash
   npm run db:migrate --workspace=db/sample   # public
   npm run db:migrate --workspace=db/iam      # iam
   npm run db:migrate --workspace=db/audit    # audit
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

`audit/0002_public_triggers.sql` creates a trigger on `public.users`, so **`db:migrate --workspace=db/sample` must run before `db:migrate --workspace=db/audit`**. If you reset the database, always follow the order: public → iam → audit.

Set `DATABASE_URL` in the respective `.env` file for local use. For CI/production, set `DATABASE_URL` as an environment variable.

