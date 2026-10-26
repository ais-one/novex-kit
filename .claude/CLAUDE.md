# CLAUDE.md

## Project overview

A monorepo template for building full-stack JavaScript applications with Node.js, Express, and Vue. It combines backend and frontend apps in `apps/`, and shared reusable code in `common/`. Designed as an updateable template — custom code is isolated so upstream template updates can be applied cleanly.

- Node.js 24+ required, npm 11+ required
- Fully ES Modules, TS/JSDoc typing rules — see [Code conventions](#code-conventions)
- TypeScript runs natively via Node 24 (`node file.ts`) — no build step needed for scripts

## Repository structure

@../docs/structure.md

## TypeScript configuration

`tsconfig.base.json` at the repo root holds the compiler options shared by most of the monorepo (`target: ES2025`, `module`/`moduleResolution: NodeNext`, `allowImportingTsExtensions`, `noEmit`, `strict: false`, `skipLibCheck: true`, `types: ["node"]`). Directory groups that used to duplicate an identical `tsconfig.json` per workspace now share a single project file that extends it and covers the whole group via `include`:

| Group       | Project file            | Covers                                                                               |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `db/*`      | `db/tsconfig.json`      | `db/sample`, `db/iam`, `db/audit`, `db/rag`                                          |
| `common/*`  | `common/tsconfig.json`  | `common/compiled/node`, `common/schemas` (`common/compiled/vue` has no tsconfig yet) |
| `scripts/*` | `scripts/tsconfig.json` | `db-mocks`, `generators`, `service-mocks`, and the top-level script files            |

A file-specific `exclude` still lives on the group's `tsconfig.json` where needed — e.g. `common/tsconfig.json` excludes the standalone `oss-uploader`/`s3-uploader` usage/server scripts under `compiled/node/services/oss-files/` from the main project.

Type checking runs `tsc --noEmit -p <dir>` on every project with a `tsconfig.json` (each `apps/*` app, plus `common/`, `db/`, `scripts/`) — in the pre-push hook and in CI (the `ts-lint` step of `Lint / Lint Check`). There are no per-workspace `typecheck` npm scripts; a new app is picked up as long as it has its own `tsconfig.json`. All projects currently pass with zero errors — keep it that way.

`apps/*` is the exception: `apps/tsconfig.base.json` is a separate, near-duplicate base file (not yet migrated to extend the root one), and each app keeps its **own** `tsconfig.json` rather than a shared group file, since apps' `include` lists differ (each has its own `src/**`, `global.d.ts`, `__tests__/**`). The clean-architecture apps (`sample-common`, `sample-queue-consumer`, `sample-rest-app-v2`) go further and use fully standalone `strict: true` configs that don't extend any shared base at all — see [Clean architecture](#clean-architecture-controller--service--repository) below.

## Setup

`npm i` at the root installs every workspace and activates the git hooks. Running the sample apps (local DB first for `sample-api`), their URLs and logins: `docs/install.md` (the single source of truth); local DB server, migrations and seeds: `db/README.md`.

## Common commands

Verify a change before finishing: `npm run check` (Biome, no writes — `npm run check:write` to auto-fix) and `npm run test:workspaces`; after TypeScript changes also `npx tsc --noEmit -p <project>` for each affected project (see [TypeScript configuration](#typescript-configuration)). Every root script and workspace command: `docs/install.md#command-reference` (the single source of truth).

## Testing

All tests use Node's built-in test runner (`node --test`).

### Why every test uses `.only()`

App test scripts (`apps/*`) pass `--test-only`, which means **only tests and suites marked `.only()` run**. Plain `describe()` / `it()` calls are silently skipped. Always use `describe.only()` and `it.only()` unless you intend the test to be skipped. (`common/compiled/node` and `common/vanilla/iso` test scripts don't pass `--test-only`, so plain `it()` runs there.)

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

| Package                           | Path                                         | Purpose                                |
| --------------------------------- | -------------------------------------------- | -------------------------------------- |
| `@common/node/tests/http-mocks`   | `common/compiled/node/tests/http-mocks.ts`   | Express req/res stubs for unit tests   |
| `@common/node/tests/http-request` | `common/compiled/node/tests/http-request.ts` | Real HTTP client for integration tests |

### Running a single test file

From within an app workspace (e.g. `apps/sample-api`), call `node --test` directly on one file instead of the glob the `test:unit`/`test:integration` scripts use:

```bash
# unit test (mocks allowed)
node --test-reporter=spec --experimental-test-coverage --experimental-test-module-mocks --test --test-only ./__tests__/unit/category.controller.test.ts

# integration test (real HTTP, isolated process)
node --test-reporter=spec --test --test-only --test-isolation=process --test-concurrency=1 ./__tests__/integration/category.route.test.ts
```

Per-workspace `test` scripts run `test:unit` and `test:integration` (some also chain a `test:schemas` step, currently stubbed to `exit 0`) — see each app's `package.json` for its exact composition. Zod schema exports are validated by the root `test:schemas` script (`scripts/test-schemas.ts <schema-dir>`), which the git hooks run for `common/schemas` and `apps/*/schemas`.

## Backend architecture: generated CRUD + OpenAPI

CRUD generation lives in `db/<schema>/` (`sample`, `iam`, `audit` — note `db/audit` names the script `generate:crud` and has no `docs:*` scripts), not in the consuming apps — apps import the generated routes/controllers via the `@db/<schema>` package rather than owning a copy. Each schema workspace follows a **generate once, own forever** pattern driven by its Drizzle schema:

- `npm run crud:generate` (from `db/<schema>/`, via `scripts/generators/generate-crud.ts`) reads that schema's Drizzle file and, per table, emits `crud/<table>/generated/{schema.ts,routes.ts,controller.ts}` (always overwritten) plus sidecar `crud/<table>/{schema.ts,controller.ts,routes.ts}` (created once, then developer-owned — the generator never touches them again). Customize a table by editing the sidecar files, not the `generated/` ones.
- Optional `generate-crud.config.json` next to `db/<schema>/package.json` controls per-table exclusions (`exclude`, `schemaOnly`, `excludeFromBody`, `excludeFromResponse`).
- `npm run docs:generate` (from `db/<schema>/`, via `scripts/generators/generate-openapi.ts`) scans the sidecar `schema.ts` files (Zod, not Drizzle) to build an OpenAPI 3.1 YAML — it automatically picks up schema overrides. Each schema workspace has its own output file (`db/<schema>/openapi/openapi.yaml`) and its own `docs:validate` — there is no merged, repo-wide doc for `db/*`.
- Consuming apps mount the generated routes directly, e.g. `apps/sample-api/src/router.ts` does `import categoriesRoute from '@db/sample/crud/categories/routes';` (no app-local copy, no `.ts` extension — the package's `exports` map appends it).
- `common/schemas/` (standalone, hand-written schemas — not CRUD-generated) has its own separate `docs:generate`/`docs:validate`/`docs:make-html` scripts, run from within that folder, producing `common/schemas/docs/openapi/openapi.merged.yaml`.
- Full details, flags, and override examples: `scripts/generators/README.md`.

## Backend request lifecycle

Most backend apps (`sample-api`, `base-iam`, `cron`, `sample-a2a-mcp-rag`) build their Express instance from `preRoute()` / `postRoute()` in `common/compiled/node/express/` — read both before adding global middleware or changing startup order. The clean-architecture apps (`sample-rest-app-v2`, `sample-queue-consumer`) call `express()` directly and register `requestIdMiddleware` / `errorHandler` themselves in `src/index.ts`.

- `preRoute()` (called from the app's entry module, e.g. `app.ts`) wires, in order: `services.start(app, server)` → auth service setup (`authService.setup`, only if `JWT.TOKEN_SERVICE_NAME` and `JWT.USER_SERVICE_NAME` are configured) → `requestIdMiddleware` → `loggerMiddleware` → a WS-upgrade bypass → `/health` (mounted _before_ auth — healthchecks are always unprotected) → helmet → cors → body-parser (routes matching `BODYPARSER_RAW_ROUTES` skip JSON parsing so raw bytes are preserved for webhook signature checks) → cookie-parser.
- App-specific routes are mounted next (e.g. `apps/sample-api/src/router.ts`), then `postRoute(app, express)` adds static/history-fallback handling, `notFoundHandler`, and `errorHandler` last. **New routes must be registered before `postRoute()` runs** or they'll 404.
- `authUser` is **not** global middleware — it's opt-in per route (imported from `@common/node/auth/jwt` and added to a specific route file). A new route is unauthenticated by default unless you add it explicitly.

## Database (local dev)

One npm workspace per database under `db/` (`@db/sample` → `public`, `@db/iam` → `iam`, `@db/audit` → `audit`, served locally by PGlite via `npm run serve` in `scripts/db-mocks`; `@db/rag` → separate PostgreSQL + pgvector on port 55432). Schemas, consumers, migrations, seeds and reset: `db/README.md` (the single source of truth).

- **Migrate `db/sample` (public) before `db/audit`** — an audit trigger on `public.users` depends on it.

## Creating a new app

Backend (`create:app` CLI from a clean-architecture template, or copy `sample-api`) and frontend (copy `sample-vue-full` or `sample-vue-minimal`): `docs/create-app.md` (the single source of truth). Never develop directly in the `sample-*` templates.

## Code conventions

`docs/conventions.md` is the single source of truth for coding, typing, export, config/secrets, logging and commit standards — edit it there, not here. It is imported below so it is always in context:

@../docs/conventions.md

Lint/format with `biome`: `npm run check` reports only (no writes); `npm run check:write` auto-fixes.

## Clean architecture (controller → service → repository)

Backend apps under `apps/*` follow a layered architecture — **routes → controllers → services → repositories** — so each file has one reason to change and business logic stays independent of Express and of any specific data source.

This layering is always **TypeScript with `strict: true`** — never plain JS+JSDoc, and never the `strict: false` seen in this repo's older tsconfigs (`common/compiled/node`). Give the app its own `tsconfig.json` + `global.d.ts` (copy from `apps/sample-common` or `apps/sample-queue-consumer` — see the skill for the exact template and the strict-mode pitfalls already hit building those).

| Layer                   | File pattern                            | Responsibility                                                                           | May import/call                                      |
| ----------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Routes                  | `routes/*.routes.ts`                    | Express route wiring only                                                                | controllers                                          |
| Controllers             | `controllers/*.controller.ts`           | Parse/validate the request (`zod`), call **one** service method, shape the HTTP response | services                                             |
| Services                | `services/*.service.ts`                 | Business logic and orchestration — no `req`/`res`, no direct DB/HTTP calls               | repositories                                         |
| Repositories — data     | `repositories/data/*.repository.ts`     | Persistence: DB/cache queries                                                            | DB/cache clients (e.g. `@common/node/services/db/*`) |
| Repositories — external | `repositories/external/*.repository.ts` | Calls to third-party APIs or other internal services over HTTP                           | `fetch` / SDK clients                                |

The repository layer is the **only** layer allowed to know about a physical data source, and is split internally into `data/` (databases, caches) and `external/` (third-party APIs, other internal services) so swapping a data source or an API provider never touches a service or controller. Not every app needs both subfolders populated — an empty counterpart is fine; a repository file that mixes the two concerns is not.

Don't confuse this with `common/compiled/node/services/*` — that's shared cross-app **infrastructure** (DB client factories, cloud SDK wrappers) consumed _by_ the repository layer, not the per-app business-logic service layer described above.

**Mockability is mandatory** for services and repositories — a controller must be testable without a real service, and a service must be testable without a real DB or network call:
- Preferred: a plain module with named function exports (see `common/compiled/node/auth/store.ts`), mocked in tests with `mock.module()` (see [Module mock paths](#module-mock-paths)).
- Acceptable when a layer needs interchangeable implementations: a class with constructor-injected dependencies and a default singleton export, mocked by constructing with a fake collaborator instead.
- Either way: a service never imports a concrete DB client or calls `fetch` directly, and a controller never imports a repository directly — only the layer immediately below.

**DTOs are mandatory at every boundary.** A repository maps a raw DB row or a third-party API response into the domain model before returning it — never let either raw shape leak up to the service. A controller maps the domain model into a response DTO before sending it — never `res.json()` a domain model directly. Every successful response is `{ message, data }` (`data: null` when there's nothing to return); errors keep the existing `{ error: { code, message } }` shape already produced by `common/compiled/node/errors/error.middleware.ts`. Validate a third-party response with zod in the repository the moment it's received, the same way request input is validated in the controller (`common/compiled/node/errors/validate.ts`).

Full conventions and a worked example live in the `clean-architecture` skill — invoke with `/clean-architecture`. Use the `clean-architecture-reviewer` subagent to audit a change or an app for layering/mockability/DTO compliance.

## Logging and tracing

All logging goes through `@common/node/logger`'s structured JSON transport (level, timestamp, service — already automatic) — never `console.*`. On top of that base, controller/service/repository code follows a stricter contract:

- **Per-layer responsibility**: controllers log request-received / request-completed (status, duration) and unhandled errors bubbling up; services log business-meaningful domain events only (`resource.action`, past tense, e.g. `report.generated`) — not technical noise; repositories log only failures and slow-query warnings, never successful happy-path calls.
- **Every log line identifies its origin** — a `layer` (`controller`/`service`/`repository`) and `fn` (the function/route/tool name) field, not just a bare message.
- **Every unit of work carries a `requestId`** (header `x-request-id` — the one canonical name repo-wide; do not introduce alternates like `x-correlation-id`) from entry (HTTP request, MCP tool call, queue message) through every layer, and forwarded on any call to another of this repo's own apps.
- **The logger is an injected dependency** inside services and repositories — passed down explicitly (or constructor-injected for class-based code), never grabbed as the bare global from that code, so log calls carry the current request's context and stay mockable in tests the same way a repository is. The bare global `logger` import remains correct for infrastructure code outside this layering.
- Errors extend `common/compiled/node/errors/AppError` and its subclasses. A layer wrapping a lower-level error uses `{ cause: originalError }` so the full chain survives to the one place that logs it — normally the central `errorHandler` in `common/compiled/node/errors/error.middleware.ts` for HTTP, or a consumer's top-level catch for a queue message. Don't log the same error at more than one layer on its way up.

Full mechanism, field shapes, the request-ID propagation rules, and the per-app gaps to close live in the `structured-logging` skill — invoke with `/structured-logging`.

## Commit conventions

Single source of truth [](../docs/git.md#commit-message)

## Git hooks

Single source of truth [](../docs/git.md#hooks)

## Branch conventions

Single source of truth [](../docs/git.md#branching-and-workflow)

## Updating from upstream template

`apps/**`, `db/**` and `local-`-prefixed workflows/actions are protected from the upstream sync; everything else is template-owned and gets replaced — so downstream-only code and workflows must live in those paths. How the sync works (it force-pushes `chore/sync-upstream`; you open the PR yourself), and how to protect more paths: `docs/github.md#sync-upstream-template` (the single source of truth).

## Docker / Podman

Each deployable app has its own multi-stage `apps/<app>/Dockerfile`, built from the repo root (`-f apps/<app>/Dockerfile .`) — commands and build args: `docs/install.md` (Run Sample API → Docker/Podman).

## CI/CD (GitHub Actions)

Every workflow — trigger, purpose, required check — is listed in `docs/github.md#workflows` (the single source of truth); CI pipeline details in `docs/github.md#ci`.

- When a workflow adds or drops a `secrets.*` / `vars.*` reference, update `docs/github.md#repo-secrets-and-variables`.
- Secrets must never be stored in the repo — inject them via the deployment platform or CI/CD secrets store.

## Authorization

The auth module (`common/compiled/node/auth`) supports three authorization layers, all optional and composable:

| Layer  | Module                                        | JWT field populated                 |
| ------ | --------------------------------------------- | ----------------------------------- |
| RBAC   | `rbac.ts` — tenant-scoped roles + permissions | `tenant_id`, `tenant_plan`, `roles` |
| FGA    | `openfga.ts` — fine-grained per-object checks | `roles` (flat list)                 |
| Legacy | DB `users.roles` column                       | `roles` (flat list, fallback)       |

Route middleware available after `authUser`:

| Middleware                        | Source                           | Checks                                              |
| --------------------------------- | -------------------------------- | --------------------------------------------------- |
| `requireRole(...roles)`           | `@common/node/auth/require-role` | flat `req.user.roles` — works with all three layers |
| `requireFga(relation, object)`    | `@common/node/auth/openfga`      | OpenFGA tuple lookup                                |
| `req.rbac.hasRole(...roles)`      | attached by `authUser`           | flat JWT `roles` array                              |
| `req.fga.check(relation, object)` | attached by `authUser`           | ad-hoc FGA check inside a handler                   |

**Wiring detail:** the RBAC → FGA → legacy fallback chain runs once, at **token creation** (`createToken`), not on every request — a request only ever checks the flattened `roles` array already baked into the JWT. This means RBAC/FGA config changes don't take effect for a user until their token is refreshed. `authUser` itself does the JWT verify step and populates `req.user`, `req.rbac`, and `req.fga`; RBAC/FGA setup is invoked conditionally from inside `authService.setup`, which only runs if `JWT.TOKEN_SERVICE_NAME`/`USER_SERVICE_NAME` are configured (see Backend request lifecycle above).

## Key documentation

| File                                         | Purpose                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/CONTRIBUTING.md`                    | Contributor guide — issue reporting and security disclosure (PR rules: `docs/git.md#pull-requests`)                                                                                                            |
| `docs/conventions.md`                        | Coding, tooling, commit, and runtime standards                                                                                                                                                                 |
| `docs/structure.md`                          | Repo layout — every app, `common/*` package (import name, workspace or not) and `db/*` schema; imported under Repository structure                                                                             |
| `docs/create-app.md`                         | Creating apps — `create:app` CLI (backend templates, naming rules, post-create steps, adding a template), copying `sample-api`, and creating a Vue frontend                                                    |
| `docs/git.md`                                | Git hooks (setup via `npm install` → `.githooks/setup.sh`, what each hook checks), branch/tag naming, merge flow, hotfix flow, commit messages, pull requests                                                  |
| `docs/github.md`                             | GitHub repo settings (rulesets, environments, code scanning, Dependabot), CI workflows and required checks, release management                                                                                 |
| `docs/install.md`                            | Backend, frontend setup, development guide, and workspace reference                                                                                                                                            |
| `docs/design/authn.md`                       | Authentication setup — SAML 2.0 and OIDC provider configuration                                                                                                                                                |
| `docs/design/authz.md`                       | Authorization — RBAC and FGA: setup, JWT payload, roles fallback chain, usage                                                                                                                                  |
| `docs/design/pg-audit-implementation.md`     | PostgreSQL audit trail implementation (SOC2/HIPAA)                                                                                                                                                             |
| `.claude/skills/clean-architecture/SKILL.md` | Controller/service/repository layering and mocking conventions                                                                                                                                                 |
| `.claude/skills/structured-logging/SKILL.md` | Per-layer logging, error handling, and request-ID tracing conventions                                                                                                                                          |
| `.claude/skills/openapi-docs/SKILL.md`       | Per-app OpenAPI 3.1 spec from zod DTOs (`src/openapi.ts` → `docs/openapi/<app>.yaml`)                                                                                                                          |
| `docs/cloud/`                                | Cloud deployment examples — AWS, Alibaba Cloud, Cloudflare                                                                                                                                                     |
| `docs/github.md#repo-secrets-and-variables`  | GitHub Secrets and Variables required by the workflows                                                                                                                                                         |
| `docs/github.md#troubleshooting`             | Troubleshooting the manual Release workflow (`release.yml`, git-cliff)                                                                                                                                         |
| `docs/NOTES.md`                              | Design decisions, caveats, open questions, TODOs                                                                                                                                                               |
| `docs/housekeeping.md`                       | Dependency/Actions updates — Dependabot config plus the `/housekeeping-scan-actions`, `/housekeeping-update-packages`, `/housekeeping-update-node-npm` and `/housekeeping-check-tsconfig` Claude Code commands |
| `scripts/generators/README.md`               | `generate-crud.ts` / `generate-openapi.ts` flags, config file, override recipes                                                                                                                                |
| `db/README.md`                               | Local PGlite multi-schema DB server, migrations, seeding, reset                                                                                                                                                |
