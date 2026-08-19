---
name: clean-architecture
description: Guidance and copy-paste templates for this repo's controller → service → repository layering (single-responsibility, separation of concerns), the repository layer's internal data/ vs external/ split, DTO boundaries (never let a DB row or a third-party response shape reach a service, never send a domain model directly as an HTTP response), zod validation at every input and external-response boundary, the standard `{ message, data }` API response envelope, and making service + repository layers mockable for Node's built-in test runner via mock.module() or constructor injection. Use when adding a new endpoint, MCP tool, or feature to any app under apps/* (vision-custom-api, vision-mcp, vision-rag, document-parser, vision-common), when a route handler or tool handler mixes HTTP/MCP parsing with business logic with direct DB/fetch calls, when introducing a repository for a database or a third-party API client, when shaping an API response or validating input/output, or when writing a unit test for a service or repository that needs a mocked dependency. Not for generic code review, styling, or unrelated refactors — see the clean-architecture-reviewer subagent for auditing existing code against these rules.
---

# Clean architecture: controller → service → repository

## Usage

Invoke bare (`/clean-architecture`) for the full pattern. Invoke with an app name (`/clean-architecture vision-mcp`) to jump straight to that app's section under [Applying this to the apps in this repo today](#applying-this-to-the-apps-in-this-repo-today).

This skill is the detailed reference behind the short policy in root `CLAUDE.md` under "Clean architecture (controller → service → repository)". Read that section first if you haven't — this document expands on it.

For what each layer logs, how errors propagate with their stack intact, and how a `requestId` threads through all three layers (and across a call to another of this repo's own apps), see the companion `structured-logging` skill — the two are meant to be read together when building a new controller/service/repository.

## Language and strictness requirement

Every controller, service, repository, and consumer built under this pattern is **TypeScript with `strict: true`** — no exceptions, even though this repo generally allows plain JS+JSDoc (`vision-mcp`, `common/vanilla/*`) and most existing tsconfig.json files here (`common/compiled/node`, `apps/vision-custom-api`) run with `strict: false`. This architecture is stricter than the repo default on purpose: a repository/service boundary is exactly where a silent `any` or an unchecked `null` does the most damage, since it's the layer everything else is mocked against.

Give the app its own `tsconfig.json` — this is the one actually used (and verified against real strict-mode output, not just written and assumed to work) in `apps/vision-common` and `apps/sample-queue-consumer`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "erasableSyntaxOnly": true
  },
  "include": ["src/**/*.ts", "global.d.ts"]
}
```

Also copy that app's `global.d.ts` (ambient `logger` / `__config` / `Express.Request` declarations). Every app that imports `@common/node/logger` needs the `Express.Request` augmentation to typecheck cleanly — even an app with no authenticated routes — because the logger middleware itself references `req.log`/`req.startTime`.

Two things strict mode surfaces that `strict: false` hides, both hit while building the reference example in `apps/vision-common`/`apps/sample-queue-consumer`:

- **`noNonNullAssertion` (biome) and strict nullability (tsc) can pull in opposite directions.** When narrowing an optional value — e.g. a mock's captured callback in a test — don't reach for `!`; biome forbids it repo-wide. Destructure into a local and use `assert.ok(value, 'message')` instead: it's a real runtime check (fails loudly if the assumption is wrong, unlike a silently-no-op `?.`), and TypeScript narrows through it the same way.
- **This repo's existing apps have a `tsconfig.json` but no wired-up `typecheck` npm script**, so nothing catches type errors in CI today — that's how a real `SASLOptions` mismatch and a real nullability bug both made it past "it looks right" during this skill's own reference implementation. Run `npx tsc --noEmit -p <app>/tsconfig.json` yourself after writing new code. Don't assume clean; verify.

This requirement applies going forward, to new code written under this skill. It does not retroactively migrate existing plain-JS apps (`vision-mcp`) or non-strict tsconfigs (`common/compiled/node`, `vision-custom-api`) — that would be a separate, larger effort.

## The four layers

```
routes/*.routes.ts            Express wiring only
      │
      ▼
controllers/*.controller.ts   parse/validate request → call ONE service method → shape response
      │
      ▼
services/*.service.ts         business logic, orchestration — framework-agnostic
      │
      ▼
repositories/
  data/*.repository.ts        DB / cache queries
  external/*.repository.ts    third-party or other-service HTTP calls
```

Dependencies only ever point **downward**. A layer may only call the layer directly beneath it:

- A **route** does nothing but map an HTTP verb + path to a controller function. No logic, no `try`/`catch`.
- A **controller** parses and validates input (`zod`), calls exactly one service method, and maps the result or thrown error to an HTTP response. It never contains business rules and never imports a repository, a DB client, or `fetch` directly.
- A **service** implements business logic: validation rules, orchestration across multiple repositories, computing derived values. It never imports `express` types, never touches `req`/`res`, and never imports a DB client or calls `fetch` directly — it calls a repository instead. This is what makes a service testable outside of Express.
- A **repository** is the only layer allowed to know about a physical data source. It translates between the service's plain-data vocabulary and a specific DB client, ORM, cache, or third-party API.

Skipping a layer (a controller calling a repository directly, a route embedding business logic) is the most common violation — it's what today's fat handlers in `vision-custom-api`, `vision-mcp`, and `vision-rag` do (see the [rollout map](#applying-this-to-the-apps-in-this-repo-today)).

## Validation and DTO boundaries

Four distinct shapes exist in any feature, and code in this repo must not let them blur into each other:

1. **Persistence shape** — the raw row/entity a DB client returns (a drizzle-inferred row, a knex result row). Exists only inside `repositories/data/*.repository.ts`.
2. **External-provider shape** — the raw JSON a third-party API or another of this repo's own services returns. Exists only inside `repositories/external/*.repository.ts`.
3. **Domain model** — what a service operates on, and what a repository returns to it. Independent of both the DB's column names and any one provider's field names — a `Report` domain type looks the same whether it was assembled from Postgres or from OpenAI's response.
4. **Response DTO** — what a controller sends to the client. Never the domain model itself.

**The repository layer's job includes translation, not just fetching.** A `data/*.repository.ts` function maps a DB row into the domain shape before returning it; an `external/*.repository.ts` function maps a provider's response into the domain shape before returning it. Neither ever returns its raw shape upward — if a service can see a drizzle row's column names, or reach into an OpenAI response via `choices[0].message.content`, the repository didn't do its job. Do the mapping as a small private (non-exported) function inside the repository file, right after the query/call — it doesn't need its own folder or file for one feature.

**The controller's job includes translation on the way out, too.** A controller never does `res.json(domainModel)` — it maps whatever the service returned into a response DTO. See [API response envelope](#api-response-envelope) below.

### Validation with zod — where it applies and where it doesn't

- **Controller (mandatory)**: validate every request input (`body`/`params`/`query`) with zod before it reaches the service. Use the existing `common/compiled/node/errors/validate.ts` middleware — `validate(target, schema)` parses `req[target]` and calls `next(ValidationError)` on failure, wired into `common/node/errors/AppError.ts`'s hierarchy — rather than hand-rolling `schema.parse()` inside every handler.
- **Repository — external (mandatory)**: parse a third-party or other-service response with zod immediately on receipt, before mapping it to the domain shape. An external system can change its response shape without warning; catching that at the repository boundary as a clear, typed failure beats an `undefined` silently propagating three layers up into a service.
- **Repository — data (not required)**: a DB row already has a trusted, statically-typed shape from your own `schema.ts` (drizzle) or query definition — re-validating it with zod is usually redundant work. The discipline here is mapping to the domain shape, not re-validation.
- **Response DTO (recommended)**: define it as a zod schema too, with `.meta({ id: '...' })` — the exact pattern already used in `common/schemas/{auth,payment,notification}.schema.js`. It plugs directly into the existing OpenAPI generation (`scripts/generate-openapi.ts` imports schemas by name and builds `docs/openapi/openapi.merged.yaml` from them) — one schema is both the runtime shape and the documentation, nothing to keep in sync by hand.

### API response envelope

Every successful response is:

```ts
type ApiResponse<T> = { message: string; data: T | null };
```

```json
{ "message": "Report generated", "data": { "id": 1, "pdfUrl": "https://..." } }
```

`data` is always present as a key — `null` when there's genuinely nothing to return (e.g. after a DELETE), never an omitted field. This is a **separate envelope from error responses**, which already have their own established, working shape — the two are not in conflict, they're for different outcomes:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "email and password are required" } }
```

— produced automatically by `common/compiled/node/errors/error.middleware.ts`'s `errorHandler`, documented by `common/schemas/error.schema.js`'s `ErrorResponseSchema`. A controller only ever constructs the success envelope; the error envelope is the error middleware's job, not something a controller builds by hand.

The success envelope is defined once, shared, next to the existing error schema — real, in `common/schemas/api-response.schema.js`:

```js
// common/schemas/ is .js + JSDoc, not TypeScript, matching its existing files — this is
// outside the TS+strict requirement above, which applies to apps/* controllers/services/repositories.
import { z } from 'zod';

/** @param {import('zod').ZodTypeAny} dataSchema */
export const ApiResponseSchema = (dataSchema, id) =>
  z.object({ message: z.string(), data: dataSchema.nullable() }).meta({ id });
```

`apps/sample-rest-app` constructs the envelope directly as a plain object in its controllers (`res.json({ message: 'Order created', data: toOrderResponseData(order) })`) rather than parsing through `ApiResponseSchema` at runtime — the schema's real value is feeding `scripts/generate-openapi.ts` (documenting the shape) with the same `.meta({ id })` pattern `common/schemas/auth.schema.js` already uses, not re-validating your own output. Wire `ApiResponseSchema(OrderResponseDataSchema, 'OrderResponse')` into that generator when this app's endpoints get documented.

**Existing gaps this convention doesn't retroactively fix**: `common/schemas/auth.schema.js`'s `MessageResponseSchema` (`{ message }`, no `data` field) is sample/template content for a demo scaffold that isn't wired to any real app; `apps/document-parser`'s actual controllers return `{ success, data, error }` (from its `ParseResult` type), predating this convention. Neither needs to change for this skill to be usable — a new feature built under this skill uses `{ message, data }` regardless of what neighboring sample or pre-existing code does.

## The repository layer's internal split: `data/` vs `external/`

Split every app's `repositories/` folder into two kinds, even if one side starts empty:

- **`repositories/data/*.repository.ts`** — persistence. Talks to a database or cache. Owns query/schema knowledge. Built on a DB client, typically one of `@common/node/services/db/*` (`drizzle.ts`, `knex.ts`, `redis.ts`, `keyv.ts`) or an app-local client.
- **`repositories/external/*.repository.ts`** — integration. Talks to a third-party API or another one of this repo's own services over HTTP (OpenAI, Telegram, S3/OSS, another `apps/*` service). Owns URL/auth/payload-shape knowledge for that one dependency.

Keep them as separate files even for a single feature — a `reports.repository.ts` that both queries Postgres *and* calls an external PDF-rendering API has two reasons to change and belongs in `data/reports.repository.ts` + `external/pdf-provider.repository.ts` instead.

**Not everything needs a repository.** A repository exists only for an actual external boundary (a database, a cache, an HTTP call). An in-process library with no I/O (e.g. `pdfmake` rendering a buffer, a pure calculation) is still service-layer logic — wrapping it in a repository just to have one adds a pointless indirection.

### Don't confuse this with `common/compiled/node/services/*`

`common/compiled/node/services/` (`db/`, `oss-files/`, `ali.ts`, `aws.ts`) is shared **infrastructure** used across every app in the repo — DB client factories, cloud SDK wrappers. It is consumed *by* an app's repository layer; it is not itself the per-app business-logic "service" this document describes, despite the shared name. When in doubt: if it's cross-app, template-wide, and about a connection/client, it's `@common/node/services/*`; if it's this feature's business rule, it's this app's `services/*.service.ts`.

The message queue driver is a related but separate case: it lives in `apps/vision-common/services/mq/`, not `common/compiled/node/`, because it's specific to the `vision-*` apps rather than template-wide — see that folder's `README.md` for why, and for the "one dedicated app per consumer" deployment rule.

## Mockability

A controller must be testable without a real service; a service must be testable without a real DB or network call. Two idioms are used in this repo — pick whichever fits the layer, don't force one style where the other already fits better:

### Idiom A — named function exports + `mock.module()` (preferred default)

Matches the repo-wide "named exports preferred, no barrel files" convention (`docs/conventions.md`) and the existing precedent at `common/compiled/node/auth/store.ts` (a repository in every sense: `findUser`, `updateUser`, `setRefreshToken`, etc., as plain named exports, with the underlying drizzle/keyv instance injected via a `setup()` call rather than hardcoded).

```ts
// repositories/data/reports.repository.ts
import { db } from '@common/node/services/db/knex.ts';

export async function findReportRecord(id: number) {
  return db()('reports').where({ id }).first();
}
```

```ts
// repositories/external/pdf-provider.repository.ts
export async function renderPdf(record: Record<string, unknown>): Promise<string> {
  const res = await fetch('https://pdf-provider.example.com/render', {
    method: 'POST',
    body: JSON.stringify(record),
  });
  const { url } = await res.json();
  return url;
}
```

```ts
// services/reports.service.ts
import { findReportRecord } from '../repositories/data/reports.repository.ts';
import { renderPdf } from '../repositories/external/pdf-provider.repository.ts';

export async function buildReport(id: number) {
  const record = await findReportRecord(id);
  if (!record) throw new Error(`report ${id} not found`);
  const pdfUrl = await renderPdf(record);
  return { ...record, pdfUrl };
}
```

Test — mock both repositories, then dynamically import the service **after** the mocks are registered:

```ts
// __tests__/reports.service.test.ts
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

mock.module('../repositories/data/reports.repository.ts', {
  namedExports: { findReportRecord: async () => ({ id: 1, title: 'Q1' }) },
});
mock.module('../repositories/external/pdf-provider.repository.ts', {
  namedExports: { renderPdf: async () => 'https://example.com/q1.pdf' },
});

const { buildReport } = await import('../services/reports.service.ts');

describe.only('reports.service', () => {
  it.only('attaches a pdfUrl from the external provider', async () => {
    const report = await buildReport(1);
    assert.equal(report.pdfUrl, 'https://example.com/q1.pdf');
  });

  it.only('throws when the record does not exist', async () => {
    mock.module('../repositories/data/reports.repository.ts', {
      namedExports: { findReportRecord: async () => null },
    });
    const { buildReport: buildReportNotFound } = await import('../services/reports.service.ts?not-found');
    await assert.rejects(() => buildReportNotFound(999));
  });
});
```

Two rules that silently break this pattern if missed (both already called out in root `CLAUDE.md` → Testing, repeated here because they bite specifically at the service/repository boundary):

1. **`mock.module()` must run before the module under test is imported.** Put the `mock.module()` calls at the top of the file, before any static `import` of the service, and use a dynamic `await import()` for the service itself — as above. A static `import` at the top of the test file loads (and caches) the real repository before the mock is registered.
2. **The `.ts`-extension rule depends on *how* the specifier resolves — get this wrong and you get `Cannot find module`, not a clear error:**
   - A **relative path** (`'../repositories/data/reports.repository.ts'`) needs the extension, exactly like a normal `import` — there's no package `exports` map involved, so Node's plain relative resolution requires an exact filename match.
   - A specifier that resolves **through a package's `exports` map wildcard** — e.g. `@common/node/auth/store`, matched by `common/compiled/node/package.json`'s `"./**/*": "./**/*.ts"` — must **omit** the extension. The wildcard pattern itself appends `.ts`; typing it yourself produces `store.ts.ts`.
   - `apps/vision-common` has no `exports` map at all, so deep imports from it (`@apps/vision-common/services/mq/kafka.ts`) always keep the extension, same as a relative path.
   - When in doubt, match whatever a normal `import` of that same specifier already looks like elsewhere in the codebase — `mock.module()` follows the same resolution rules, it doesn't invent its own.

### Idiom B — class with constructor-injected dependencies (when a layer needs interchangeable implementations)

Already used in this repo at `apps/document-parser`: `ParserController` takes a `DocumentParserService` in its constructor (defaulting to a real singleton), and `DocumentParserService` takes an array of `IDocumentParser` implementations. Reach for this when a layer's whole job is picking between multiple interchangeable backends (multiple file-format parsers, multiple payment providers, etc.) — the interface + constructor injection models that better than a flat function module would.

```ts
// controllers/parser.controller.ts (existing, apps/document-parser/src/controllers/parser.controller.ts)
export class ParserController {
  private parserService: DocumentParserService;
  constructor(parserService: DocumentParserService = defaultParserService) {
    this.parserService = parserService;
  }
  async parseDocument(req: Request, res: Response): Promise<void> { /* ... */ }
}
```

Tests construct the class with a fake collaborator instead of calling `mock.module()`:

```ts
const fakeService = { parseBuffer: async () => ({ success: true, data: 'x' }), getSupportedFormats: () => ['.txt'] };
const controller = new ParserController(fakeService as unknown as DocumentParserService);
```

Either idiom must satisfy the same rule: **a service never imports a concrete DB client or calls `fetch` directly, and a controller never imports a repository directly** — only the layer immediately below.

### Which idiom for which layer, in practice

- Controllers: idiom A is usually simplest (plain exported handler functions per route, as in `common/compiled/node/health/controller.ts`) unless the app is already class-based (`document-parser`).
- Services: idiom A by default.
- Repositories — `data/`: idiom A. Inject the DB client the same way `auth/store.ts` does (a `setup()`/lookup function or a module-level import of `@common/node/services/db/*`), not a hardcoded connection inline in every query function.
- Repositories — `external/`: idiom A, one file per external dependency.

### Test tiers

- **Unit tests** (`*.test.ts`, run by the default `test` script): mock every repository a service depends on; mock the underlying driver (`fetch`, the DB client) for any repository test that has non-trivial mapping/error-handling logic worth covering. Never touch a real DB or network.
- **Integration tests** (`*.integration.test.ts` — matches the `test:integration` script pattern already used in `apps/vision-custom-api`): allowed to hit a real or sandboxed dependency. Use `@common/node/tests/http-request` for real HTTP calls and `@common/node/tests/http-mocks` for Express req/res stubs when you want a unit-style test of a controller without spinning up a server.
- All tests use `describe.only()` / `it.only()` — see root `CLAUDE.md` → Testing. A test written without `.only()` silently never runs.

## Directory layout template

```
apps/<app>/src/
  routes/
    <feature>.routes.ts
  controllers/
    <feature>.controller.ts
  services/
    <feature>.service.ts
  repositories/
    data/
      <feature>.repository.ts
    external/
      <provider>.repository.ts
  __tests__/
    <feature>.service.test.ts
    <feature>.controller.test.ts
```

Naming: `kebab-case` files, one export family per file, `*.routes.ts` / `*.controller.ts` / `*.service.ts` / `*.repository.ts` suffixes so the layer is obvious from the filename alone (mirrors `document-parser`'s existing `*.controller.ts`/`*.service.ts` suffixes).

### A TypeScript-execution nuance across apps

`common/compiled/node` and the templates above use **native Node TS execution** (`node file.ts`, per root `CLAUDE.md` and `docs/conventions.md`) — relative imports keep the `.ts` extension (`from '../services/db/schema.ts'`). `apps/document-parser` instead has its own `tsc`/`tsx` build step and uses the NodeNext convention of a `.js` extension inside `.ts` source (`from '../services/document-parser.service.js'`). Follow whichever convention the app you're editing already uses; for a new app or feature, default to native execution with `.ts` extensions, matching `docs/conventions.md`'s stated direction ("avoid compilation, use NodeJS native typescript").

## Do / Don't

**Do**

- Give each file one reason to change: a controller changes only if the HTTP/MCP-tool contract changes; a service changes only if a business rule changes; a repository changes only if the data source or API changes.
- Split `repositories/` into `data/` and `external/` even when only one currently has content.
- Export services and repositories as named functions, or as a class with constructor-injected dependencies — never as a function that reaches for a hardcoded singleton client inline.
- Write the service unit test against mocked repositories; save real DB/network coverage for an explicitly named integration test.
- Reuse an existing shared client (`@common/node/comms/telegram2`, `@common/node/services/db/*`, `@common/node/services/oss-files/*`) from inside a repository rather than reimplementing the call.
- Map a repository's raw DB row or external-provider response into the domain shape before returning it — never let either raw shape reach the service.
- Give every success response the `{ message, data }` envelope; let the existing error middleware own the error envelope.
- Validate a third-party response with zod the moment it's received, inside the repository.

**Don't**

- Don't call a DB client, ORM, or `fetch` from a controller or a service.
- Don't let a controller branch on domain rules or compute derived values — that belongs in the service.
- Don't put a `data/` concern and an `external/` concern in the same repository file.
- Don't create a repository for something with no I/O (e.g. in-process PDF layout) — that's service logic.
- Don't statically `import` the module under test above its `mock.module()` calls in a test file.
- Don't `res.json()` a domain model or a raw repository result directly — map it to a response DTO first.
- Don't let a service reach into a DB row's column names or a provider response's raw field paths — that means the repository didn't map.
- Don't invent a second success-response shape — always `{ message, data }`.

## Applying this to the apps in this repo today

No app in this repo currently has a repository layer, and only one has controller/service separation. This section maps the pattern onto each app's actual current code — for when implementation starts, not to be done as part of setting up this skill.

### `document-parser` — reference example, no changes needed

Already `routes/parser.routes.ts` → `ParserController` (`controllers/parser.controller.ts`) → `DocumentParserService` (`services/document-parser.service.ts`) → `IDocumentParser` implementations (`parsers/{pdf,word,excel}-parser.ts`). It has no DB or external API, so it has no `repositories/` folder — the parsers already play the "data access" role for local buffers/files. Hold this app up as the concrete example when explaining the pattern to someone; don't force a repository layer onto it.

### `vision-custom-api` — extract from `routes/leehung/index.ts` and `routes/leehung/modules/index.ts`

Today: `src/routes/leehung/index.ts` (~136 lines) inlines HTTP parsing, a 14-day range validation, calling `agent.ts`, and Telegram replies. `src/routes/leehung/modules/index.ts` (~1680 lines) mixes PDF layout/rendering with all report-building logic. `agent.ts` calls OpenAI's Responses API inline and keeps session state in a module-level `Map`.

Target split:
- `controllers/leehung.controller.ts` — HTTP parsing/validation (the date-range check) + one call into a report service.
- `services/report.service.ts` — orchestrates: ask OpenAI for the report content, assemble report data, hand off to PDF rendering, send the result via Telegram. This is where the 1680-line `modules/index.ts` gets split — the report-building *business logic* stays here; the PDF *layout/rendering* is a pure in-process concern (no repository needed for it, per the Do/Don't above) and can stay a plain helper called by the service.
- `repositories/external/openai.repository.ts` — wraps the OpenAI Responses-API + MCP tool-calling currently inline in `agent.ts`.
- `repositories/external/telegram.repository.ts` — a thin adapter over the existing shared `@common/node/comms/telegram2` module; don't reimplement Telegram calls, just give this app's service a stable, mockable contract in front of the shared one.

### `vision-mcp` — extract from `tools/leehung.js`

Today: `tools/leehung.js` (~333 lines) has 5 `registerTool` callbacks that each inline input handling, a raw `fetch()` to `VISION_NMS_URL`/`VISION_CUSTOM_API_URL`, response shaping, and Telegram file delivery (temp-file write, send, unlink).

Target split: each `registerTool` callback is this app's "controller" — keep it thin (parse tool input via `zod`, call one service function, format the MCP tool response). Add `services/*.service.ts` for orchestration, and:
- `repositories/external/nms.repository.ts` — wraps the raw `fetch()` calls to `VISION_NMS_URL`.
- `repositories/external/vision-custom-api.repository.ts` — wraps the raw `fetch()` calls to `VISION_CUSTOM_API_URL`.
- Telegram file delivery via the same shared `@common/node/comms/telegram2` module as `vision-custom-api`. If the same external-API repository logic ends up duplicated between `vision-custom-api` and `vision-mcp`, hoist the shared repository into `apps/vision-common` (its documented role: shared backend code for `apps/*` — see its `README.md`) rather than copying it twice.

### `vision-rag` — the layering doubles as fixing the current broken wiring

Today this app doesn't run: `ingestion-service/src/index.ts` and `query-service/src/index.ts` import `./ingest.js`/`./query.js`, neither of which exists — the real logic sits one directory up in `service-ingest.ts`/`service-query.ts`, inlining S3 fetch + text extraction + chunking + OpenAI embedding + raw `pg.Pool` SQL in one file each. `rag-mcp-server/src/mcp.ts` has the same missing-import problem plus a reference to an undefined `db`.

Target split, once this work starts, for both `ingestion-service` and `query-service`:
- `services/ingest.service.ts` / `services/query.service.ts` — the orchestration currently in `service-ingest.ts`/`service-query.ts`, calling repositories instead of raw clients inline.
- `repositories/data/pgvector.repository.ts` — wraps the raw `pg.Pool` SQL (currently inline) behind query functions.
- `repositories/external/s3.repository.ts`, `repositories/external/openai.repository.ts` (and `cohere.repository.ts` for reranking, since `cohere-ai` is imported but not yet in `package.json`) — wrap the currently-inline S3/embedding/LLM/rerank calls.

This is real implementation work and is explicitly out of scope for setting up this skill — noted here so the target shape is unambiguous once that work is picked up.

### `vision-common` — shared home for cross-app repositories

Beyond `constants.ts`, now also hosts `services/mq/` (the Kafka-backed `QueueDriver` — see its `README.md`). Its documented role (see its own `README.md`) is the same as the archived template's `shared-sample`: shared backend code for `apps/*`. Once a repository (e.g. the NMS client, or a Telegram helper) is needed by more than one `vision-*` app, that's the signal to move it here instead of duplicating it — mirroring how `common/compiled/node` hosts cross-app infrastructure for every app in the repo. `apps/sample-queue-consumer` is the first real consumer built against it — copy its shape (`repositories/external/` → `services/` → `consumers/`) for the next one.

## References

- Root `CLAUDE.md` → "Clean architecture (controller → service → repository)" (short policy), "Testing" (`.only()`, `mock.module()`, shared test utilities).
- `common/compiled/node/auth/store.ts` — real named-export repository, mocked via `mock.module()` in the root `CLAUDE.md` example.
- `common/compiled/node/health/{controller,router}.ts` — real thin controller + router split.
- `apps/document-parser/src/{controllers,services,interfaces,parsers}` — real controller → service → interchangeable-implementation split.
- `common/compiled/node/tests/{http-mocks,http-request}.ts` — shared test utilities for controller-level and integration tests.
- `apps/vision-common/services/mq/{types,kafka}.ts` + `__tests__/unit/kafka.test.ts` — real strict-mode TypeScript repository-layer driver, with a real crash bug (a caught failure in `open()` left state that made an uncaught failure in `subscribe()` possible) found by actually booting it, not just by the unit tests.
- `apps/sample-queue-consumer` — real controller(consumer)/service/repository split for a message-driven (non-HTTP) app; its `tsconfig.json`/`global.d.ts` are the copy-paste strict-mode template referenced above.
- `common/compiled/node/errors/{AppError,error.middleware,validate}.ts` — real, already-wired-in error hierarchy and request-validation middleware (used from `postRoute()` in real apps, confirmed in `apps/vision-custom-api/src/app.ts`).
- `common/schemas/{error,auth,payment,notification,api-response}.schema.js` + `scripts/generate-openapi.ts` — real zod-schema-to-OpenAPI pipeline (`.meta({id})` → `docs/openapi/openapi.merged.yaml`); `auth`/`payment`/`notification` are sample/template content, `error`/`api-response` are the real, live envelope schemas.
- `apps/sample-rest-app` — the complete reference implementation: every layer, the `data`/`external` repository split, DTO mapping (including a field — `internalRiskScore` — that deliberately never reaches the response), zod at both the request and external-response boundary, `{ message, data }` responses, injected `ContextLogger`, and tiered tests (service/controller/external-repository mocked at the unit tier; the data repository tested at the integration tier against a **real PostgreSQL instance** — this app's database is always Postgres, never sqlite or an in-memory store, so its repository test is real, not mocked). Verified end to end with a real HTTP boot, a real Postgres round-trip, and a real external API call — read this before the inline snippets elsewhere in this document if you want to see it all wired together.
- `.claude/skills/structured-logging/SKILL.md` — companion skill: per-layer logging, error handling, and request-ID tracing on top of this layering.
- `.claude/agents/clean-architecture-reviewer.md` — subagent that audits a change or app against both this document and `structured-logging`.
