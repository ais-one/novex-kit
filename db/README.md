## Description

`db/` holds all database schema, migration, and seed code for the project, kept separate from `apps/` and `common/` since this is userland data code that consuming applications import from, not template-owned code. It's organized as one npm workspace per PostgreSQL schema:

- **`db/sample`** (`@db/sample`) — public schema, the main application database (used by `apps/sample-api`, `apps/cron`)
- **`db/iam`** (`@db/iam`) — identity and access management tables
- **`db/audit`** (`@db/audit`) — audit log and hard-delete log tables
- **`db/rag`** (`@db/rag`) — pgvector-backed documents/chunks tables (used by `apps/sample-a2a-mcp-rag`)

`db/` itself is not a workspace — it just holds the shared PGlite data directory (`dev.db/`, gitignored). The server that runs it (`scripts/db-mocks/serve-db.ts`, `@tools/db-mocks`) lives outside `db/`, grouped with the other local dev-infra mocks (redis, kafka; SAML/OIDC per [docs/design/authn.md](../docs/design/authn.md)).

`sample`, `iam` and `audit` share the one PGlite socket server on port **5432**. `rag` defaults to a separate PostgreSQL + pgvector instance on port **55432** (see [rag](#rag-schema) below). Migration and seeding uses **drizzle-orm** / **drizzle-kit** with per-schema `drizzle.config.ts` files, colocated with each schema's `schema.ts`.

---

## Quick Start (local dev)

Start the server from `scripts/db-mocks/`; run the `--workspace=db/<schema>` migration/seed commands from the **repo root** (they fail from `db/` — or `cd db/<schema>` and drop `--workspace`).

### 1. Start the local database server

```bash
# from the repo root
cd scripts/db-mocks
npm run serve
```

This starts a single PGlite socket server on `127.0.0.1:5432` serving all three schemas (`public`, `iam`, `audit`), backed by `db/dev.db`. Leave this terminal open while running migrations or seeding.

Override the data directory with `--dbpath` (the default, `../../db/dev.db`, is relative to `scripts/db-mocks/`), e.g. `npm run serve -- --dbpath /tmp/scratch.db`.

### 2. Create each schema's `.env`

`db:migrate` falls back to `postgresql://localhost:5432/db_express` when `DATABASE_URL` is unset, but `db:seed` runs `node --env-file=.env seed.ts` and fails without the file. Create `db/sample/.env`, `db/iam/.env` and `db/audit/.env` (all gitignored) containing:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/db_express?sslmode=disable
```

### 3. Run migrations (in order)

Each schema (`sample`, `iam`, `audit`) is its own workspace with the same script names (`db:migrate`, `db:generate`, `db:seed`, `db:studio`) — run them via `--workspace` from the repo root:

```bash
# 1. public schema (must run first — audit triggers depend on public.users)
npm run db:migrate --workspace=db/sample

# 2. iam schema
npm run db:migrate --workspace=db/iam

# 3. audit schema (must run after db/sample — 0002_public_triggers depends on public.users)
npm run db:migrate --workspace=db/audit
```

Equivalently, `cd` into the schema folder and drop the `--workspace` flag, e.g. `cd sample && npm run db:migrate`.

### 4. Seed initial data

```bash
# sample (users, test data)
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
| `npm run serve` (from `scripts/db-mocks/`) | Start PGlite on 5432 (public + iam + audit schemas) |
| `npm run db:migrate --workspace=db/<schema>` | Apply pending migrations for that schema |
| `npm run db:generate --workspace=db/<schema>` | Generate a new migration from schema changes |
| `npm run db:seed --workspace=db/<schema>` | Run all seed files for that schema, in order |
| `npm run db:studio --workspace=db/<schema>` | Open Drizzle Studio for that schema |
| `npm run crud:generate --workspace=db/<schema>` | Generate CRUD schema/routes/controllers from the Drizzle schema (`sample`, `iam`; `db/audit` names it `generate:crud`) |
| `npm run docs:generate --workspace=db/<schema>` | Build `db/<schema>/openapi/openapi.yaml` from the CRUD sidecar schemas (`sample`, `iam` only) |
| `npm run docs:validate --workspace=db/<schema>` | Validate that OpenAPI file (`sample`, `iam` only) |

Where `<schema>` is `sample`, `iam`, `audit` or `rag`. `rag` has only `db:generate`, `db:migrate` and `db:studio` (no seed). See [scripts/generators/README.md](../scripts/generators/README.md) for the CRUD/OpenAPI generators.

---

## Reverting and Retesting Migrations

PGlite stores its data in a directory (`db/dev.db/`). To reset to a clean slate:

```bash
# Stop serve first (Ctrl+C), then delete the data directory, from the repo root
rm -rf db/dev.db
```

Then restart and rerun migrations in order:

```bash
# in a separate terminal, from scripts/db-mocks/
npm run serve

# from the repo root
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
├── dev.db/                       # PGlite data directory (gitignored) — served by scripts/db-mocks/serve-db.ts
├── tsconfig.json                 # shared TS project for all db/* workspaces
├── sample/                       # public schema
│   ├── schema.ts                 # Drizzle schema (source of truth)
│   ├── .env                      # local DATABASE_URL (create it — gitignored)
│   ├── drizzle.config.ts         # schemaFilter: ['public']
│   ├── generate-crud.config.json # CRUD generator exclusions
│   ├── seed.ts                   # seed runner
│   ├── crud/<table>/             # generated + sidecar CRUD schema/routes/controllers
│   ├── drizzle/
│   │   ├── 0000_left_ben_grimm.sql          # all CREATE TABLE statements
│   │   ├── 0001_functions_and_triggers.sql  # PL/pgSQL functions + triggers
│   │   ├── 0002_remove_rbac_fga.sql         # drops RBAC/FGA tables (moved to iam)
│   │   ├── 0003_remove_audit.sql            # drops old audit tables (moved to audit schema)
│   │   ├── 0004_swift_hercules.sql
│   │   └── meta/_journal.json
│   └── seeds/
│       ├── initial_users.ts
│       ├── initial_testdata.ts
│       ├── icc.json
│       └── state.json
├── iam/                          # iam schema
│   ├── schema.ts                 # Drizzle schema (source of truth)
│   ├── .env                      # local DATABASE_URL (create it — gitignored)
│   ├── drizzle.config.ts         # schemaFilter: ['iam']
│   ├── generate-crud.config.json
│   ├── seed.ts                   # seed runner
│   ├── crud/<table>/
│   ├── openapi/openapi.yaml      # output of docs:generate
│   ├── identity-schema*.sql      # reference identity schemas (PostgreSQL / MySQL)
│   ├── drizzle/
│   │   ├── 0000_cultured_iron_man.sql … 0006_mighty_punisher.sql
│   │   └── meta/_journal.json
│   └── seeds/
│       ├── initial_iam_users.ts
│       ├── initial_roles.ts
│       ├── initial_rbac.ts
│       └── initial_openfga.ts
├── audit/                        # audit schema
│   ├── schema.ts                 # Drizzle schema (source of truth)
│   ├── .env                      # local DATABASE_URL (create it — gitignored)
│   ├── drizzle.config.ts         # schemaFilter: ['audit']
│   ├── generate-crud.config.json
│   ├── seed.ts                   # no-op placeholder
│   ├── crud/<table>/
│   └── drizzle/
│       ├── 0000_married_morbius.sql       # CREATE SCHEMA audit + audit_log + hard_delete_log
│       ├── 0001_audit_append_only.sql     # enforce_append_only() function + append-only triggers
│       ├── 0002_public_triggers.sql       # audit_trigger_func() + audit_users trigger on public.users
│       └── meta/_journal.json
└── rag/                          # pgvector documents/chunks
    ├── schema.ts                 # Drizzle schema (source of truth)
    ├── vector.ts                 # pgvector column helper
    ├── .env.example              # copy to .env — DATABASE_URL on port 55432
    ├── drizzle.config.ts         # schemaFilter: ['public']
    └── drizzle/
        ├── 0000_brainy_captain_britain.sql
        └── meta/_journal.json
```

---

## Schema Sources

| Schema | Drizzle schema file | Import (from apps) |
|---|---|---|
| `public` | `db/sample/schema.ts` | `@db/sample/schema` |
| `iam` | `db/iam/schema.ts` | `@db/iam/schema` |
| `audit` | `db/audit/schema.ts` | `@db/audit/schema` |
| `public` (rag tables) | `db/rag/schema.ts` | `@db/rag/schema` |

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

For raw SQL (triggers, functions, REVOKE/GRANT) that drizzle-kit cannot generate, create a SQL file manually using the next free migration number (e.g. `0005_my_trigger.sql` in `db/sample`) and add an entry to `drizzle/meta/_journal.json`.

---

## Connection String

| Environment | URL |
|---|---|
| Local dev (PGlite) | `postgresql://postgres:postgres@127.0.0.1:5432/db_express?sslmode=disable` |
| Staging / production (real PostgreSQL) | `postgresql://<user>:<pass>@<host>:5432/<db>` |

The `.env` files in each schema subdirectory contain the local `DATABASE_URL`. drizzle-kit reads it automatically.

## rag schema

`db/rag` keeps its tables in `public` (`schemaFilter: ['public']`) and needs the `vector` extension. Its config defaults to `postgresql://localhost:55432/db_express`, i.e. a separate PostgreSQL + pgvector instance, not the shared PGlite server. Copy `db/rag/.env.example` to `db/rag/.env` and point `DATABASE_URL` at whichever server you use (the PGlite mock on 5432 also loads `vector`).

---

## Migration Order Dependency

`audit/0002_public_triggers.sql` creates a trigger on `public.users`, so **`db:migrate --workspace=db/sample` must run before `db:migrate --workspace=db/audit`**. If you reset the database, always follow the order: public → iam → audit.

Set `DATABASE_URL` in the respective `.env` file for local use. For CI/production, set `DATABASE_URL` as an environment variable.

