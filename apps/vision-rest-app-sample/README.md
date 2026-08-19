# vision-rest-app-sample

Reference implementation of the full backend stack this repo's `.claude` skills describe. Copy this app's shape for a new real REST service; don't develop directly in it.

**Database: this app always runs against PostgreSQL.** Not sqlite, not an in-memory store, not a "swap it for something real later" placeholder — Postgres is the permanent choice here, matching every other real app in this repo's `common/node/services/db/*` convention. `repositories/data/db.ts` connects to it via Knex (`knex`), which every mutating route uses through `req.dbTransaction()` rather than importing the connection directly — see [Auditing](#auditing) below.

## What it demonstrates

| Constraint | Where |
|---|---|
| Controller → service → repository layering | `routes/` → `controllers/` → `services/` → `repositories/{data,external}/` |
| Repository `data/` vs `external/` split | `repositories/data/orders.repository.ts` (PostgreSQL, via Knex) vs `repositories/external/exchange-rate.repository.ts` (a real, free, no-auth currency API) |
| DTO boundaries | `dto/order.dto.ts` — persistence row → domain `Order` (includes `internalRiskScore`) → response DTO (never includes it) |
| zod validation | Request body/params via `common/node/errors/validate.ts`; the external API's response validated before use |
| `{ message, data }` response envelope | `controllers/orders.controller.ts` |
| Structured, per-layer, injected logging | `ContextLogger` threaded from controller → service → repository via `.scope()`; nothing imports the bare global `logger` inside these layers |
| Request-ID tracing, including cross-service | `requestIdMiddleware` sets `req.requestId`; the exchange-rate repository forwards `log.context.requestId` as `x-request-id` on its outbound call; `auditContext` reuses the same `req.requestId` as the audit trail's `session_id` |
| AppError + stack/cause preservation | `NotFoundError` for a missing order; `common/node/errors/error.middleware.ts` is the single place that logs an unhandled error |
| TypeScript, `strict: true` | `tsconfig.json` |
| Mockable service/repository, tiered tests | `__tests__/unit/` — service test mocks both repositories, external-repository test mocks `fetch`. `__tests__/integration/` — the data repository tested against a real PostgreSQL instance. |
| SOC2/HIPAA-style audit trail plumbing | `@apps/vision-common/express/audit/audit-context.ts`'s `auditContext()`, wired in `src/index.ts` — see [Auditing](#auditing) |

## Auditing

Every route goes through `req.dbTransaction()` (attached by `auditContext(getDb())` in
`src/index.ts`) instead of calling `getDb()` directly — see
`controllers/orders.controller.ts`. This is the application-layer half of
`docs/design/pg-audit-implementation.md`: it opens a Knex transaction and sets four
`SET LOCAL` session variables (`app.current_user_id`, `app.current_tenant_id`,
`app.session_id`, `app.transaction_id`) that a Postgres `audit_trigger_func()` trigger would
read to attribute row changes. The database side — the `audit_log` table, the trigger
functions, and the triggers themselves (design doc §2-§4) — isn't provisioned by this sample;
wiring the app-layer plumbing through is what's demonstrated here. This sample also has no
auth middleware, so `req.user` is always undefined and `app.current_user_id` records as `''`
— a real app runs its auth middleware before `auditContext` so `req.user` is populated.

## Domain: orders

- `POST /orders` — `{ customerEmail, items: [{ sku, quantity, unitPriceCents }] }` → computes the total, an internal risk score, and (best-effort) a EUR-converted total, persists the order, responds `{ message: "Order created", data: {...} }`.
- `GET /orders/:id` — responds `{ message: "Order found", data: {...} }`, or a 404 `{ error: {...} }` if the order doesn't exist.

## Running locally

1. A running PostgreSQL instance. Locally this was developed against:
   ```bash
   docker run -d --name visionpostgres -e POSTGRES_USER=visionuser -e POSTGRES_PASSWORD=vision123 -e POSTGRES_DB=mydb -p 5432:5432 postgres:15
   ```
2. Copy `.env.sample` to `.env` and set `DATABASE_URL` to point at it.
3. `npm run start` — connects on boot (`openDb()` in `src/index.ts`) and **fails fast** if Postgres isn't reachable. Unlike `apps/vision-queue-consumer`'s best-effort queue connection, there's no acceptable degraded mode here — the database is this app's core dependency, not a side capability.

The `orders` table is created automatically (`hasTable` + `createTable`) on connect; a real service would use proper Knex migrations instead.

The external repository calls the real, free `api.frankfurter.dev` currency API — no API key needed, nothing to configure.

## Running tests

- `npm run test:unit` — mocks both repositories; no live Postgres needed.
- `npm run test:integration` — needs the same `DATABASE_URL`-reachable Postgres as `npm run start`; truncates the `orders` table between tests via `afterEach`.
