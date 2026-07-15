# CLAUDE.md

## Project overview

A monorepo template for building full-stack JavaScript applications with Node.js, Express, and Vue. It combines backend and frontend apps in `apps/`, and shared reusable code in `common/`. Designed as an updateable template — custom code is isolated so upstream template updates can be merged cleanly.

- Node.js 24+ required, npm 11+ required
- Fully ES Modules — no CommonJS
- In `.ts` files: use TypeScript type annotations — do **not** use JSDoc for types
  - used mainly in `apps/*` (with ts), `common/compiled/*` and`scripts/*`
- In `.js` files: use JSDoc (`/** @type */`, `/** @param */`, etc.) for type hints and IDE autocomplete
  - used mainly in `apps/*` (with js) and `common/vanilla/*`
- TypeScript runs natively via Node 24 (`node file.ts`) — no build step needed for scripts

## Repository structure

```
apps/                # backend and frontend apps (npm workspace)
  sample-api/        # sample backend app — copy and rename, do not develop here directly
  base-iam/          # sample IAM service — auth, RBAC/FGA, user management (SAML/OIDC)
  cron/              # HTTP-triggered cron microservice — plain Express app (its own preRoute/postRoute), no internal scheduler; an external scheduler hits routes like `POST /cron/process-outbox`. Auth is a separate bearer-token scheme (`CRON_API_KEY`), not the main JWT/RBAC/FGA system
  sample-mcp/        # MCP server example
  sample-a2a/        # agent-to-agent sample — supervisor (Claude) + specialist (OpenAI RAG) over MCP
  sample-rag/        # RAG sample — document ingestion + retrieval via MCP tools + OpenAI generation
  sample-vue-full/   # full-featured sample Vue app (port 8081)
  sample-vue-minimal/ # minimal Vue app (port 8080)
  sample-common/     # internal shared backend code for apps/* workspaces (@apps/sample-common)
common/              # shared reusable code (npm workspaces)
  compiled/          # modules that require a build step
    node/            # Node.js modules, Express middleware and services (@common/node)
    vue/             # Vue-specific shared modules (@common/vue)
  vanilla/           # plain JS modules, no build step
    iso/             # isomorphic utilities, runs in Node and browser (@common/iso)
    web/             # browser-only utilities and web components
  schemas/           # shared zod schemas — not an npm workspace (imported directly), but has its own package.json with docs:generate/validate/make-html scripts (run from within common/schemas/)
db/                  # database schemas, migrations, seeds — separate npm workspaces, one per schema
  dev.db/            # PGlite data file for local dev (gitignored) — served by scripts/db-mocks
  sample/            # @db/sample — public schema: schema.ts, drizzle.config.ts, migrations, seeds (consumed by sample-api, cron)
  iam/               # @db/iam — iam schema: schema.ts, drizzle.config.ts, migrations, seeds (consumed by base-iam)
  audit/             # @db/audit — audit schema: schema.ts, drizzle.config.ts, migrations (SOC2/HIPAA trail)
docs/                # project documentation
generated/           # gitignored scratch folder for local build/runtime artifacts — only .gitignore/README.md are tracked
scripts/             # code/OpenAPI generation tooling, service mocks (npm workspace)
  generators/        # @tools/generators — generate-crud.ts (Drizzle schema → Zod/routes/controllers) and generate-openapi.ts
  service-mocks/     # redis/kafka/SAML/OIDC mocks
  db-mocks/          # serve-db.ts — local PGlite socket server backing db/sample, db/iam, db/audit
.github/             # GitHub Actions workflows and CONTRIBUTING.md
.githooks/           # native git hooks (pre-commit, pre-push)
```

`sample-mcp`, `sample-a2a`, and `sample-rag` are demo scripts (`npm run demo`, etc.), not long-running services — most have no real `test` script (stubbed to exit 0). `sample-mcp` is the MCP *server* (StreamableHTTP transport); `sample-a2a` and `sample-rag` are MCP *clients*, each with their own `mcp-client.ts` (duplicated, not shared). In `sample-a2a`, `supervisor.ts` and `specialist.ts` are two separate A2A protocol servers (ports 3100/3101, `/.well-known/agent.json` + `POST /` task endpoints) — the supervisor classifies and delegates to the specialist, which does the actual MCP-backed RAG query.

## Setup

```bash
# 1. install all workspace dependencies
npm i

# 2. configure git hooks (also runs automatically via npm prepare)
chmod +x .githooks/setup.sh && ./.githooks/setup.sh
# or manually:
# git config core.hooksPath .githooks

# 3. run the sample backend
cd apps/sample-api && npm run start

# 4. run the minimal Vue frontend
cd apps/sample-vue-minimal && npm run dev
```

## Common commands

```bash
# linting and formatting (biome)
npm run check          # biome check, no writes — safe to run in CI
npm run check:write    # biome check --write (auto-fix lint + format)
npm run ci             # biome ci (used in CI/CD)

# testing
npm run test:workspaces     # run tests in all workspaces

# workspace management
npm ls -ws                              # list all workspaces
npm i <pkg> --workspace=<path>          # install into a specific workspace
npm outdated -ws                        # check outdated packages across all workspaces
```

There is no root-level `docs:generate`/`docs:validate` anymore — OpenAPI doc generation is scoped to whichever package owns the schemas: `cd common/schemas && npm run docs:generate` for the shared cross-cutting schemas (output: `common/schemas/docs/openapi/openapi.merged.yaml`), or `npm run docs:generate` from within `db/<schema>/` for a schema's per-table CRUD docs (see below).

## Testing

All tests use Node's built-in test runner (`node --test`).

### Why every test uses `.only()`

Test scripts pass `--test-only`, which means **only tests and suites marked `.only()` run**. Plain `describe()` / `it()` calls are silently skipped. Always use `describe.only()` and `it.only()` unless you intend the test to be skipped.

### Skipping a test file

To skip an entire file without breaking the runner, wrap everything — including `before`/`after` lifecycle hooks — in a single outer `describe.skip`. Root-level `before`/`after` hooks still execute even when all inner describes are skipped, which causes crashes if the hooks set up servers or other resources.

```ts
// Correct — hooks are inside the skipped suite and won't run
describe.skip('my suite', () => {
  before(async () => { /* start server */ });
  after(async () => { /* stop server */ });
  describe('...', () => { ... });
});
```

### Module mock paths

When using `mock.module()`, omit the `.ts` extension. Node's mock resolver appends `.ts` automatically when running TypeScript files, so including it produces a double-extension error (`store.ts.ts`).

```ts
// Correct
mock.module('@common/node/auth/store', { namedExports: { findUser: mockFn } });

// Wrong — resolves to store.ts.ts
mock.module('@common/node/auth/store.ts', { namedExports: { findUser: mockFn } });
```

### Shared test utilities

| Package | Path | Purpose |
|---|---|---|
| `@common/node/tests/http-mocks` | `common/compiled/node/tests/http-mocks.ts` | Express req/res stubs for unit tests |
| `@common/node/tests/http-request` | `common/compiled/node/tests/http-request.ts` | Real HTTP client for integration tests |

### Running a single test file

From within an app workspace (e.g. `apps/sample-api`), call `node --test` directly on one file instead of the glob the `test:unit`/`test:integration` scripts use:

```bash
# unit test (mocks allowed)
node --test-reporter=spec --experimental-test-coverage --experimental-test-module-mocks --test --test-only ./__tests__/unit/users.test.ts

# integration test (real HTTP, isolated process)
node --test-reporter=spec --test --test-only --test-isolation=process --test-concurrency=1 ./__tests__/integration/users.routes.test.ts
```

Per-workspace `test` scripts run `test:unit`, `test:integration`, then `test:schema` (validates `zod` schema exports via `scripts/test-schemas.ts`) — see each app's `package.json` for its exact composition.

## Local URLs (sample backend)

| URL | Purpose |
|---|---|
| `http://127.0.0.1:3000/api/healthcheck` | Health check |
| `http://127.0.0.1:3000` | Express app with samples |
| `http://127.0.0.1:3000/native/index.html` | Unbundled Vue sample |

## Backend architecture: generated CRUD + OpenAPI

CRUD generation lives in `db/<schema>/` (`sample`, `iam`, `audit`), not in the consuming apps — apps import the generated routes/controllers via the `@db/<schema>` package rather than owning a copy. Each schema workspace follows a **generate once, own forever** pattern driven by its Drizzle schema:

- `npm run crud:generate` (from `db/<schema>/`, via `scripts/generators/generate-crud.ts`) reads that schema's Drizzle file and, per table, emits `crud/<table>/generated/{schema.ts,routes.ts,controller.ts}` (always overwritten) plus sidecar `crud/<table>/{schema.ts,controller.ts,routes.ts}` (created once, then developer-owned — the generator never touches them again). Customize a table by editing the sidecar files, not the `generated/` ones.
- Optional `generate-crud.config.json` next to `db/<schema>/package.json` controls per-table exclusions (`exclude`, `schemaOnly`, `excludeFromBody`, `excludeFromResponse`).
- `npm run docs:generate` (from `db/<schema>/`, via `scripts/generators/generate-openapi.ts`) scans the sidecar `schema.ts` files (Zod, not Drizzle) to build an OpenAPI 3.1 YAML — it automatically picks up schema overrides. Each schema workspace has its own output file (`db/<schema>/openapi/openapi.yaml`) and its own `docs:validate` — there is no merged, repo-wide doc for `db/*`.
- Consuming apps mount the generated routes directly, e.g. `apps/sample-api/src/router.ts` does `import categoriesRoute from '@db/sample/crud/categories/routes';` (no app-local copy, no `.ts` extension — the package's `exports` map appends it).
- `common/schemas/` (standalone, hand-written schemas — not CRUD-generated) has its own separate `docs:generate`/`docs:validate`/`docs:make-html` scripts, run from within that folder, producing `common/schemas/docs/openapi/openapi.merged.yaml`.
- Full details, flags, and override examples: `scripts/generators/README.md`.

## Backend request lifecycle

Each backend app builds its Express instance from `preRoute()` / `postRoute()` in `common/compiled/node/express/` — read both before adding global middleware or changing startup order:

- `preRoute()` (called from the app's `app.ts`) wires, in order: `services.start(app, server)` → auth service setup (`authService.setup`, only if `JWT.TOKEN_SERVICE_NAME` and `JWT.USER_SERVICE_NAME` are configured) → `loggerMiddleware` → a WS-upgrade bypass → `/health` (mounted *before* auth — healthchecks are always unprotected) → helmet → cors → body-parser (routes matching `BODYPARSER_RAW_ROUTES` skip JSON parsing so raw bytes are preserved for webhook signature checks) → cookie-parser.
- App-specific routes are mounted next (e.g. `apps/sample-api/src/router.ts`), then `postRoute(app, express)` adds static/history-fallback handling, `notFoundHandler`, and `errorHandler` last. **New routes must be registered before `postRoute()` runs** or they'll 404.
- `authUser` is **not** global middleware — it's opt-in per route (imported from `@common/node/auth/jwt` and added to a specific route file). A new route is unauthenticated by default unless you add it explicitly.

## Database (local dev)

`db/` holds one npm workspace per PostgreSQL schema, separate from `apps/` and `common/` — schema, migrations, and seeds are userland code, protected from upstream template sync the same way `apps/**` is. Each schema workspace colocates `schema.ts` + `drizzle.config.ts` + migrations + seeds:

| Schema | Consumed by | Drizzle schema source | Import (from apps) |
|---|---|---|---|
| `public` | `apps/sample-api`, `apps/cron` | `db/sample/schema.ts` | `@db/sample/schema` |
| `iam` | `apps/base-iam` | `db/iam/schema.ts` | `@db/iam/schema` |
| `audit` | audit trail (SOC2/HIPAA) | `db/audit/schema.ts` | `@db/audit/schema` |

The PGlite socket server itself (`scripts/db-mocks/serve-db.ts`, `npm run serve`, port 5432) lives outside `db/`, alongside the other local service mocks (redis, kafka, SAML/OIDC) — it's dev-infra tooling, not schema/migrations. It reads and writes `db/dev.db` (gitignored).

Migration order matters: `public` must migrate **before** `audit` (an audit trigger on `public.users` depends on it). Typical flow: `npm run serve` (from `scripts/db-mocks/`) in one terminal, then `npm run db:migrate --workspace=db/sample` → `db/iam` → `db/audit`, followed by the matching `db:seed --workspace=...` commands. See `db/README.md` for the full command table and how to reset local state.

## Creating a new backend service

- Copy `apps/sample-api` to a new folder in `apps/` using kebab-case naming
- Edit `.env` and `.env.json` in the new folder as needed
- Inject secrets from environment variables or a secret manager — never commit secrets
- Do not develop directly in `sample-api`

## Creating a new frontend app

Two starting points are available — pick the one that matches your needs:

| Template | Use when |
|---|---|
| `apps/sample-vue-full` | Building a full app — includes routing, auth views, UI framework, state, monitoring, and mocking already wired |
| `apps/sample-vue-minimal` | Starting from scratch or building a micro-frontend — just Vue + Vite, nothing else |

**`sample-vue-full` includes:**
- Vue Router with public/secure layout split
- Pinia state management
- Ant Design Vue UI component library
- Sentry error monitoring
- MSW (Mock Service Worker) for API mocking in development
- PWA support
- Playwright e2e test setup
- Pre-built sign-in, sign-up, dashboard, and OAuth callback views

**`sample-vue-minimal` includes:**
- Vue + Vite only
- Single `App.vue` + `Hello.vue` entry point
- No router, no UI framework, no state management

To create a new app:
- Copy the chosen template to a new folder in `apps/` using kebab-case naming
- Edit `.env` and `.env.development` as needed
- Routes use kebab-case and support up to 1 submenu level (full template only)
- Do not develop directly in the sample templates

## Code conventions

Read `docs/conventions.md` before making code changes.

- **Formatter and linter**: `biome` — `npm run check` reports only (no writes); `npm run check:write` auto-fixes
- **No `console.*`** in backend — import and use `common/node/logger` as global `logger`
- **No `console.*`** in frontend production — errors go to Sentry
- **Config loading**: use `common/node/config` for app config
- **`.env.json`**: non-sensitive structured settings, exposed via `globalThis.__config`
- **`.env`**: sensitive values loaded into `process.env`
- **Exports**: named exports preferred; default exports only for a single class, config, or plugin
- **No barrel `index.js` files**
- **No default and named exports in the same file**
- **Use native**: test runner, datetime, fetch, npm, git hooks — avoid heavy libraries where possible
- **Validation**: use `zod` for all input validation and OpenAPI schema generation
- **Globals pattern** (when needed):
  ```js
  globalThis.__myApp = globalThis.__myApp || {}
  const _key = Symbol('key')
  globalThis.__myApp[_key] = value
  ```
- Mark incomplete or planned work with `TODO`

## Commit conventions

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).

Only three types are allowed:

| Type | Use for |
|---|---|
| `feat` | new behaviour the user/consumer sees |
| `fix` | corrects broken behaviour |
| `chore` | everything else — build, ci, docs, style, refactor, perf, test, revert |

Format: `type(scope): short description`
Breaking changes: add `!` before the colon — `feat(auth)!: replace token format`

Use `czg` for interactive or AI-assisted commit messages:
```bash
npx czg          # interactive prompt
npx czg --ai     # AI-generated message (requires API key)
```

## Git hooks

Hooks live in `.githooks/` and are activated by `npm install` (via `npm prepare`) or manually via `git config core.hooksPath .githooks`.

**Pre-commit** (runs on `git commit`):
- Biome format and lint on affected directories
- Schema validation tests for affected schema directories

**Pre-push** (runs on `git push`):
- Unit tests (`npm run test:workspaces`)
- Schema validation tests

Skip hooks temporarily:
```bash
git commit --no-verify
git push --no-verify
```

## Branch conventions

| Branch | Branch from | Merge to | Notes |
|---|---|---|---|
| `rel/1.0` | `main` | `main` when production ready | Active dev branch |
| `feat/scope/name` | `rel/1.0` | `rel/1.0` via PR | New features |
| `fix/scope/name` | `rel/1.0` | `rel/1.0` via PR | Bug fixes |
| `chore/scope/name` | `rel/1.0` | `rel/1.0` via PR | Maintenance |
| `hotfix/scope/name` | `main` | `main` + `rel/1.0` + `rel/2.0` | Emergency only |
| `tag: v1.0.0` | `rel/1.0` after merge to main | — | Full release tag |
| `tag: v1.0.1` | `rel/1.0` after hotfix merges in | — | Patch tag only, no merge back to main |
| `rel/2.0` | `main` after `v1.0.0` tag | `main` when ready | Next dev cycle |

**Key rules:**
- Tags always come from `rel/*`, never directly from `main`
- `main` only receives merges from `rel/*` or `hotfix/*`
- Hotfix backport to next release uses `git cherry-pick`, reviewed as a separate PR
- PRs use squash merge to keep history clean
- PR titles follow Conventional Commits style: `fix(auth): handle expired token`

## Updating from upstream template

```bash
# commit and push your changes first, then:
git fetch upstream          # includes tags
git pull upstream <branch or tag> --no-rebase
# resolve any template-related merge conflicts
```

### Protected paths during sync

The following paths are never overwritten or deleted by the upstream sync workflow:

| Path | Purpose |
|---|---|
| `apps/**` | All backend and frontend apps |
| `db/**` | Database schemas, migrations, and seeds (userland — separate from `common/`) |
| `.github/workflows/local-*.yml` | Downstream-only GitHub Actions workflows |
| `.github/actions/local-**` | Downstream-only composite/reusable actions |

**Adding your own workflows or actions:** name them with the `local-` prefix — workflows as `local-deploy.yml`, actions as a folder `local-my-action/` containing `action.yml`. They will be preserved across all future template syncs. Files without this prefix are treated as template-owned and may be updated or removed by the sync.

To protect additional paths (e.g., a custom `docs/` folder), add a `merge=ours` rule to `.gitattributes`:

```
docs/** merge=ours
```

and configure the driver once per clone:

```bash
git config merge.ours.driver true
```

## Docker / Podman

```bash
docker build -t novex-kit \
  --target production \
  --build-arg APP_NAME=sample-api \
  --build-arg API_PORT=3000 .

docker run -p 3000:3000 novex-kit
```

## CI/CD (GitHub Actions)

| Workflow | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Lint, test, security scan, automated releases |
| `.github/workflows/deploy-cr.yml` | Build and push image to container registry |
| `.github/workflows/deploy-npm.yml` | Publish a package to npm |
| `.github/workflows/deploy-bucket.yml` | Deploy Vue frontend to object store |
| `.github/workflows/update-template.yml` | Sync upstream template changes into the repo |

Required GitHub Secrets:

| Secret | Used by | Description |
|---|---|---|
| `CR_USERNAME` | deploy-cr | Container registry username |
| `CR_PASSWORD` | deploy-cr | Container registry password |
| `RELEASE_PLEASE_APP_PRIVATE_KEY` | ci | GitHub App private key for automated releases |
| `NPM_AUTH_TOKEN` | deploy-npm | npm publish token |
| `SYNC_TOKEN` | update-template | GitHub PAT with `repo` + `workflow` scopes for template sync |
| `ACCESS_KEY_ID` | deploy-bucket | Alibaba Cloud access key (ossutil path) |
| `ACCESS_KEY_SECRET` | deploy-bucket | Alibaba Cloud secret key (ossutil path) |
| `OSS_ACCESS_KEY_ID` | deploy-bucket | Alibaba Cloud access key (AWS CLI path) |
| `OSS_ACCESS_KEY_SECRET` | deploy-bucket | Alibaba Cloud secret key (AWS CLI path) |
| `OSS_ENDPOINT` | deploy-bucket | Alibaba Cloud OSS endpoint (AWS CLI path) |

Required GitHub Variables:

| Variable | Used by | Description |
|---|---|---|
| `CR_HOST` | deploy-cr | Container registry host |
| `CR_NS` | deploy-cr | Container registry namespace |
| `CR_IMAGENAME` | deploy-cr | Image name (defaults to repo name) |
| `RELEASE_PLEASE_APP_ID` | ci | GitHub App ID for automated releases |
| `ENDPOINT` | deploy-bucket | Alibaba Cloud OSS endpoint (ossutil path) |

> Secrets must never be stored in the repo — inject them via your deployment platform or CI/CD secrets store.

## Authorization

The auth module (`common/node/auth`) supports three authorization layers, all optional and composable:

| Layer | Module | JWT field populated |
|---|---|---|
| RBAC | `rbac.js` — tenant-scoped roles + permissions | `tenant_id`, `tenant_plan`, `roles` |
| FGA | `openfga.js` — fine-grained per-object checks | `roles` (flat list) |
| Legacy | DB `users.roles` column | `roles` (flat list, fallback) |

Route middleware available after `authUser`:

| Middleware | Source | Checks |
|---|---|---|
| `requireRole(...roles)` | `@common/node/auth/rbac.js` | flat `req.user.roles` — works with all three layers |
| `requireFga(relation, object)` | `@common/node/auth/openfga.js` | OpenFGA tuple lookup |
| `req.rbac.hasRole(...roles)` | attached by `authUser` | flat JWT `roles` array |
| `req.fga.check(relation, object)` | attached by `authUser` | ad-hoc FGA check inside a handler |

**Wiring detail:** the RBAC → FGA → legacy fallback chain runs once, at **token creation** (`createToken`), not on every request — a request only ever checks the flattened `roles` array already baked into the JWT. This means RBAC/FGA config changes don't take effect for a user until their token is refreshed. `authUser` itself does the JWT verify step and populates `req.user`, `req.rbac`, and `req.fga`; RBAC/FGA setup is invoked conditionally from inside `authService.setup`, which only runs if `JWT.TOKEN_SERVICE_NAME`/`USER_SERVICE_NAME` are configured (see Backend request lifecycle above).

## Key documentation

| File | Purpose |
|---|---|
| `.github/CONTRIBUTING.md` | Contributor workflow, hooks, issue reporting, PR rules |
| `docs/conventions.md` | Coding, tooling, commit, and runtime standards |
| `docs/git-github.md` | Git workflow, branch/tag patterns, merge strategy, GitHub repo settings (branch protection, CodeQL) |
| `docs/install.md` | Backend, frontend setup, development guide, and workspace reference |
| `docs/design/authn.md` | Authentication setup — SAML 2.0 and OIDC provider configuration |
| `docs/design/authz.md` | Authorization — RBAC and FGA: setup, JWT payload, roles fallback chain, usage |
| `docs/design/pg-audit-implementation.md` | PostgreSQL audit trail implementation (SOC2/HIPAA) |
| `docs/cloud/` | Cloud deployment examples — AWS, Alibaba Cloud, Cloudflare |
| `docs/release-troubleshooting.md` | Troubleshooting `release-please` CI job failures |
| `docs/NOTES.md` | Design decisions, caveats, open questions, TODOs |
| `scripts/generators/README.md` | `generate-crud.ts` / `generate-openapi.ts` flags, config file, override recipes |
| `db/README.md` | Local PGlite multi-schema DB server, migrations, seeding, reset |
