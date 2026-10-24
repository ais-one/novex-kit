## Repository Structure

The single source of truth for the repo layout — what each folder, app, package and schema is for. Imported into [CLAUDE.md](../.claude/CLAUDE.md), so keep it accurate and concise.

```
apps/                # backend and frontend apps (npm workspace)
  sample-api/        # sample backend app — copy and rename, do not develop here directly
  base-iam/          # sample IAM service — auth, RBAC/FGA, user management (SAML/OIDC)
  cron/              # HTTP-triggered cron microservice — Express app built on the shared preRoute/postRoute, no internal scheduler; an external scheduler hits routes like `POST /cron/process-outbox`. Auth is a separate bearer-token scheme (`CRON_API_KEY`), not the main JWT/RBAC/FGA system
  sample-a2a-mcp-rag/ # current combined RAG + MCP + A2A demo — src/{a2a,mcp,rag,lib}/ + demo/, backed by @db/rag (Drizzle + pgvector)
  sample-a2a-rag-mcp-aaron/ # earlier version of the same demo — ingest/mcp-server/a2a layout, raw SQL (no Drizzle); kept for reference, not actively developed
  sample-vue-full/   # full-featured sample Vue app (port 8080)
  sample-vue-minimal/ # minimal Vue app (port 8081)
  sample-common/     # internal shared backend code for apps/* workspaces (@apps/sample-common)
  sample-queue-consumer/ # clean-architecture sample Kafka queue consumer (strict TS)
  sample-rest-app-v2/ # clean-architecture sample REST app (strict TS, Knex)
common/              # shared reusable code (npm workspaces)
  compiled/          # modules that need type-stripping or bundling (node: native TS, vue: built by Vite in the consuming app)
    node/            # Node.js modules, Express middleware and services (@common/node)
    vue/             # Vue-specific shared modules (@common/vue)
  vanilla/           # plain JS modules, no build step
    iso/             # isomorphic utilities, runs in Node and browser (@common/iso)
    web/             # browser-only utilities and web components
  schemas/           # shared zod schemas — not an npm workspace (imported directly), but has its own package.json with docs:generate/validate/make-html scripts (run from within common/schemas/)
db/                  # database schemas, migrations, seeds — separate npm workspaces, one per schema
  dev.db/            # PGlite data directory for local dev (gitignored) — served by scripts/db-mocks
  sample/            # @db/sample — public schema: schema.ts, drizzle.config.ts, migrations, seeds (consumed by sample-api, cron)
  iam/               # @db/iam — iam schema: schema.ts, drizzle.config.ts, migrations, seeds (consumed by base-iam)
  audit/             # @db/audit — audit schema: schema.ts, drizzle.config.ts, migrations, seed (no-op) (SOC2/HIPAA trail)
  rag/               # @db/rag — documents/chunks tables (+ embedding column) in the public schema of a separate PostgreSQL + pgvector instance (port 55432): schema.ts, drizzle.config.ts (consumed by sample-a2a-mcp-rag)
docs/                # project documentation
scripts/             # code/OpenAPI generation tooling, service mocks (npm workspace)
  generators/        # @tools/generators — generate-crud.ts (Drizzle schema → Zod/routes/controllers) and generate-openapi.ts
  service-mocks/     # redis/kafka mocks (SAML/OIDC: see docs/design/authn.md)
  db-mocks/          # serve-db.ts — local PGlite socket server backing db/sample, db/iam, db/audit (not db/rag — see db/README.md)
.github/             # GitHub Actions workflows and CONTRIBUTING.md
.githooks/           # native git hooks (pre-commit, commit-msg, pre-push)
```

### common

Reusable shared code and schemas for the apps in this monorepo. Only the folders with their own `package.json` under `common/compiled/*` and `common/vanilla/*` are npm workspaces; the others are imported by path or Vite alias.

| Folder | Import | What it is |
|---|---|---|
| [common/compiled/node](../common/compiled/node) | `@common/node` (workspace) | Node.js runtime modules — Express middleware, auth, logger, config, services |
| [common/compiled/vue](../common/compiled/vue) | `@common/vue` (workspace) | Vue-specific shared modules, built by Vite in the consuming app |
| [common/vanilla/iso](../common/vanilla/iso) | `@common/iso` (workspace) | isomorphic utilities — run in Node and the browser |
| [common/vanilla/web](../common/vanilla/web) | `@common/web` (Vite alias, not a workspace) | browser-only utilities and web components |
| [common/schemas](../common/schemas) | imported by path (not a workspace) | shared zod schemas; own `package.json` with `docs:generate` / `docs:validate` / `docs:make-html` scripts, run from inside the folder |

### apps notes

`sample-a2a-mcp-rag` is the current combined RAG + MCP + A2A demo (`sample-a2a-rag-mcp-aaron` is an earlier version of the same idea, kept for reference — same concept, `ingest`/`mcp-server`/`a2a` layout, raw SQL instead of Drizzle, not actively developed). In the active app: `src/rag/` ingests documents into pgvector via `@db/rag` (Drizzle); `src/mcp/server.ts` is the MCP *server* (StreamableHTTP transport, `npm run start:mcp`) exposing `rag_search`/`rag_add_document`/etc.; `src/lib/mcp-client.ts` is the MCP *client*; `src/a2a/` holds `supervisor.ts` and `specialist.ts`, two separate A2A protocol servers (`npm run start:supervisor`/`start:specialist`, `/.well-known/agent.json` + `POST /` task endpoints) — the supervisor classifies and delegates to the specialist, which does the actual MCP-backed RAG query. `demo/demo.ts` (`npm run demo`) seeds sample docs into an already-running MCP server, spawns the supervisor and specialist as child processes, sends sample queries through the supervisor, then tears both down. Most scripts here are demo entry points, not long-running services — it has no real `test` script (stubbed to exit 0).
