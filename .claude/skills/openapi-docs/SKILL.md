---
name: openapi-docs
description: Generating a per-app OpenAPI 3.1 spec from an app's zod DTOs (zod-openapi's .meta({ id }) + createDocument() in apps/<app>/src/openapi.ts), written to docs/openapi/<app>.yaml by scripts/generators/api-generator-route.ts. Every operation must document every status code its controller→service→repository chain can actually produce (every AppError subclass, 422, INVALID_JSON, the 500 fallback — see common/compiled/node/errors/AppError.ts), each with a realistic example payload and a curl in the description, a generated `**Possible errors:**` list, and `.meta({ override: { format: 'date-time' } })` on every z.date()/z.coerce.date() field. Use when adding OpenAPI docs to a REST app under apps/* (starting with sample-rest-app-v2) or enumerating an endpoint's responses. Not for apps with no HTTP business surface beyond /health, not for db/* CRUD docs (generate-openapi.ts), and not to be confused with .github/skills/api-docs-generator (Markdown reference docs).
---

# OpenAPI docs: one spec per REST app, generated from its DTOs

## Usage

Invoke bare (`/openapi-docs`) for the full pattern. Invoke with an app name (`/openapi-docs sample-rest-app-v2`) to jump to [Applying this to the apps in this repo today](#applying-this-to-the-apps-in-this-repo-today).

This assumes the vocabulary from the `clean-architecture` skill (routes → controllers → services → repositories, request vs. response DTOs, the `{ message, data }` envelope) — read that first. The idea is simple: the zod schemas a controller already validates with are the documentation source. Tag them with `.meta({ id })`, assemble them in one `src/openapi.ts` per app, and generate a static YAML from it.

## Three OpenAPI mechanisms in this repo — pick the right one

| Mechanism | Source | Command | Output |
|---|---|---|---|
| **Per-app spec (this skill)** | `apps/<app>/src/openapi.ts` (hand-assembled `createDocument()` from the app's DTOs) | `npm run docs:generate:api --workspace=scripts/generators` (`scripts/generators/api-generator-route.ts`) | `docs/openapi/<app>.yaml` |
| CRUD-generated docs | sidecar `crud/<table>/schema.ts` in `db/<schema>/` | `npm run docs:generate` in `db/sample` or `db/iam` (not `db/audit`/`db/rag` — no script there) | `db/<schema>/openapi/openapi.yaml` |
| Shared hand-written schemas | `common/schemas/*.schema.ts` | `npm run docs:generate` / `docs:validate` / `docs:make-html` from within `common/schemas/` | `common/schemas/docs/openapi/openapi.merged.yaml` |

The last two both run `scripts/generators/generate-openapi.ts`, a generic CLI (`--src`, `--schemas`, `--out`, `--prefix`, `--title`, `--version`, `--server`) that discovers schema files by convention and emits generic CRUD paths — see `scripts/generators/README.md`. It is the wrong tool for a clean-architecture app: it can't see which statuses a service actually throws, and it invents paths from table names rather than reading the app's routes. Don't extend it for that; write `src/openapi.ts` instead.

`apps/sample-api/docs/openapi/openapi.yaml` and `apps/base-iam/docs/openapi/openapi.yaml` are older committed outputs of `generate-openapi.ts` (no `docs:*` script in either app's `package.json` regenerates them today). Leave them alone unless you are onboarding that app to this skill.

## What exists today, and what doesn't

**Exists:**
- `zod-openapi@^6.0.2` (and `js-yaml`) — dependencies of `@common/node` (`common/compiled/node/package.json`), hoisted to the root `node_modules`, so every app can import them.
- `scripts/generators/api-generator-route.ts` — loops `APPS = ['sample-rest-app-v2']`, dynamically imports `apps/<app>/src/openapi.ts`, and writes `yaml.dump(document)` to `docs/openapi/<app>.yaml`.
- `common/schemas/error.schema.ts` → `ErrorResponseSchema` (`{ error: { code, message } }`, `.meta({ id: 'ErrorResponse' })`), and `common/schemas/api-response.schema.ts` → `ApiResponseSchema(dataSchema, id)` (`{ message, data }` envelope). `common/schemas` is not an npm workspace — import these by relative path.

**Does not exist (to create):**
- `apps/sample-rest-app-v2/src/openapi.ts` — so `docs:generate:api` **currently fails** on the missing import. Creating it is step one.
- Any `.meta()` annotation on `apps/sample-rest-app-v2/src/dto/order.dto.ts`.
- Any `docs/openapi/<app>.yaml` file (only `docs/openapi/README.md` is there).
- A `docs:validate` for `docs/openapi/` — validate ad hoc with `npx redocly lint docs/openapi/*.yaml` (same tool `common/schemas` uses).

**No live docs UI is mounted anywhere.** No app serves `/docs`, and no Swagger UI / Scalar / Redoc package is installed. Position for now: the generated YAML is the deliverable; view it with any OpenAPI viewer, or build static HTML with `npx redocly build-docs docs/openapi/<app>.yaml`. Don't add an in-process docs UI to an app without discussing it first — it adds a dependency and a route to every deployed image.

TODO (optional, not built): a single static multi-spec portal (e.g. Swagger UI with a `urls` dropdown fed from a generated `docs/openapi/index.json`) deployed separately via a `local-`-prefixed workflow. Only worth building once more than one app is onboarded.

## Response completeness: every status the code can actually produce

An operation's `responses` must have one entry per status the request can actually receive, derived by walking the exact controller → service → repository chain that route calls — never guessed from what the endpoint "feels like." The error surface is small and fully enumerable from `common/compiled/node/errors/AppError.ts`:

| Class | statusCode | code | Thrown from |
|---|---|---|---|
| `AppError` (base) | 500 (default) | `INTERNAL_ERROR` | any layer directly |
| `NotFoundError` | 404 | `NOT_FOUND` | a service, when a single-resource lookup returns nothing; also `notFoundHandler` for unmatched paths |
| `ValidationError` | 422 | `VALIDATION_ERROR` | the `validate()` middleware (`common/compiled/node/errors/validate.ts`) **or** a service, for a business-rule failure |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | nothing today — defined but not thrown by any auth middleware (see step 3) |

Plus two paths that bypass `AppError` (`common/compiled/node/errors/error.middleware.ts`):
- **Malformed JSON body** (`entity.parse.failed`) → `400 INVALID_JSON`, message `'Malformed JSON in request body'` — every route that accepts a JSON body.
- **Any uncaught non-`AppError`** (DB driver error, anything unwrapped) → status is `e.status` if it's a 4xx/5xx number, else `500`; `code` is `e.code` if it's a string (e.g. a pg SQLSTATE like `23505`, or `ECONNREFUSED`), else `INTERNAL_ERROR`; message replaced with `'An unexpected error occurred'` unless `NODE_ENV=development`. **A 5xx is always reachable on every operation** — document `500` unconditionally, with `INTERNAL_ERROR` as the example code (a raw driver code can leak through; wrap driver errors in an `AppError` with `{ cause }` in the repository if you want a stable code).

Body shape: `{ error: { code, message, details?, stack? } }` — `details` only when non-null (a `validate()` failure **always** puts the zod `issues` array there, so every 422 example should include it); a `stack` field is added only when `NODE_ENV=development` and should not appear in examples. `common/schemas/error.schema.ts`'s `ErrorResponseSchema` declares both `details` and `stack` as optional, so 422 responses and dev-mode responses match the documented schema.

Method, per operation:

1. Route wrapped in `validate('body' | 'params' | 'query', schema)` → `422 VALIDATION_ERROR`. The message is `"<path>: <zod message>"` joined with `; `.
2. Grep `throw new` in the exact controller/service/repository files that handler calls, and add one entry per distinct class. Read the actual `throw` — an unresolved reference in the *request* may be deliberately modeled as `ValidationError` (422), not `NotFoundError`. Also note what a layer *swallows*: a repository that catches and returns `null` contributes no error status.
3. Route behind auth middleware → document what that middleware **actually sends** — none of them go through `errorHandler`, so the bodies are *not* the `{ error: { code, message } }` shape. Use a separate schema per shape, not `ErrorResponseSchema`:
   - `authUser` (`auth/jwt.ts`) → `401 { message: 'Token Missing' | 'Token Format Error' | 'Token Expired Error' | 'Token Error' | 'Access Error' }`
   - `requireRole` (`auth/require-role.ts`) → `403` with a plain-text `Forbidden` body (`res.sendStatus(403)`)
   - `requireFga` (`auth/openfga.ts`) → `401 { error: 'Not authenticated' }` or `403 { error: 'Access denied' }`
   There is no `ForbiddenError`; a 403 thrown from a service needs `new AppError(msg, 403, 'FORBIDDEN')`, and the entry documents that literal code.
4. Route accepting a body → `400 INVALID_JSON`, and `413` (code `INTERNAL_ERROR`) when the body exceeds body-parser's size limit.
5. Every operation → `500 INTERNAL_ERROR`.
6. A list endpoint with no matches returns `200` with an empty array, never `404`.

OpenAPI allows one entry per status; if one status has several causes, use named `examples` under that entry.

## Possible errors in the description, curl in the description

By default, every operation's `description` includes a generated `**Possible errors:**` bullet list and one copy-pasteable curl. Renderers show `ErrorResponseSchema`'s shared generic field examples when a reader expands the schema, whatever status they are looking at; the description's Markdown is the only place the reachable codes for *this* operation are visible without clicking. Generate the list from the same `responses` object the operation uses, so the two can't drift.

Curl rules:
- Use the app's real default port from its `src/index.ts` (`API_PORT` fallback) and its real mount path — never `<host>`.
- Realistic values with the DTO's exact field names and casing; full `-H 'Content-Type: application/json' -d '{...}'` for bodies.
- One curl per operation showing the success call is enough. Optionally pass `-H 'x-request-id: ...'` — `requestIdMiddleware` echoes it back, and that's the only request-ID header name in this repo.

## Dates need an explicit `format`

zod-openapi 6.0.2 renders `z.date()` / `z.coerce.date()` as a bare `{ type: 'string' }` with no `format` (its schema-override logic: `case "date": ctx.jsonSchema.type = "string";`). Add the override — documentation only, no runtime effect:

```ts
start_time: z.coerce.date().optional().meta({ override: { format: 'date-time' } }),
```

`z.iso.datetime()` is a string schema and already renders as `format: date-time` — no override needed (e.g. `createdAt` in `order.dto.ts`).

## Recipe

### 1. Annotate DTOs with `.meta({ id })`

Only schemas that should become reusable `components.schemas` entries need an `id`; others are inlined. Keep the annotations in the DTO file next to the schema, as `common/schemas/*.schema.ts` does.

### 2. Create `src/openapi.ts` and export `document` (to create)

The generator imports the named export `document`. Template, written for `sample-rest-app-v2`'s real routes (`POST /orders`, `GET /orders/:id`, mounted at `/orders`, port `3200`):

```ts
// apps/sample-rest-app-v2/src/openapi.ts (to create)
import { createDocument } from 'zod-openapi';
import { ApiResponseSchema } from '../../../common/schemas/api-response.schema.ts';
import { ErrorResponseSchema } from '../../../common/schemas/error.schema.ts';
import { createOrderBodySchema, orderIdParamsSchema, orderResponseDataSchema } from './dto/order.dto.ts';

type ErrorBody = { error: { code: string; message: string; details?: unknown } };
type DocResponse = { description: string; content?: { 'application/json'?: { schema?: unknown; example?: ErrorBody } } };

const errorResponse = (description: string, code: string, message: string, details?: unknown) => ({
  description,
  content: {
    'application/json': {
      schema: ErrorResponseSchema,
      example: { error: { code, message, ...(details !== undefined && { details }) } },
    },
  },
});

const internalError = errorResponse('Unexpected server error', 'INTERNAL_ERROR', 'An unexpected error occurred');
const invalidJson = errorResponse('Malformed JSON in the request body', 'INVALID_JSON', 'Malformed JSON in request body');

const errorCodesSection = (responses: Record<number, DocResponse>): string =>
  [
    '',
    '**Possible errors:**',
    ...Object.entries(responses)
      .filter(([status]) => Number(status) >= 400)
      .map(([status, r]) => `- \`${status} ${r.content?.['application/json']?.example?.error.code ?? 'UNKNOWN'}\` — ${r.description}`),
  ].join('\n');

const orderResponse = ApiResponseSchema(orderResponseDataSchema, 'OrderResponse');

// Hoist each operation's responses so the description and `responses:` share one object.
const createOrderResponses = {
  201: { description: 'Order created', content: { 'application/json': { schema: orderResponse } } },
  400: invalidJson,
  422: errorResponse('Request body failed validation', 'VALIDATION_ERROR', 'customerEmail: Invalid email address', [
    { code: 'invalid_format', format: 'email', path: ['customerEmail'], message: 'Invalid email address' },
  ]),
  500: internalError, // e.g. the INSERT fails (a raw pg error surfaces its own SQLSTATE code unless wrapped)
};

const getOrderResponses = {
  200: { description: 'Order found', content: { 'application/json': { schema: orderResponse } } },
  404: errorResponse('No order exists with this id', 'NOT_FOUND', 'Order 42 not found'),
  422: errorResponse('`id` is not a positive integer', 'VALIDATION_ERROR', 'id: Invalid input: expected number, received NaN', [
    { expected: 'number', code: 'invalid_type', received: 'NaN', path: ['id'], message: 'Invalid input: expected number, received NaN' },
  ]),
  500: internalError,
};

export const document = createDocument({
  openapi: '3.1.0',
  info: { title: 'Sample REST App v2', version: '0.0.1' },
  servers: [{ url: 'http://localhost:3200', description: 'Local' }],
  paths: {
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create an order',
        description: [
          'Creates an order. `totalEurCents` is `null` if the exchange-rate lookup fails — that is not an error.',
          errorCodesSection(createOrderResponses),
          '',
          '**Example:**',
          '```bash',
          'curl -s -X POST http://localhost:3200/orders \\',
          "  -H 'Content-Type: application/json' \\",
          '  -d \'{"customerEmail":"jane.tan@example.com","items":[{"sku":"BOOK-0042","quantity":2,"unitPriceCents":1599}]}\'',
          '```',
        ].join('\n'),
        requestBody: { required: true, content: { 'application/json': { schema: createOrderBodySchema } } },
        responses: createOrderResponses,
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order by id',
        description: [
          'Returns one order.',
          errorCodesSection(getOrderResponses),
          '',
          '**Example:**',
          '```bash',
          'curl -s http://localhost:3200/orders/42',
          '```',
        ].join('\n'),
        requestParams: { path: orderIdParamsSchema },
        responses: getOrderResponses,
      },
    },
  },
});
```

Verify the example `message` strings against a real run (send a bad request, copy the actual body) rather than trusting the template — zod's wording changes between versions.

### 3. Register the app and generate

Add the app's folder name to `APPS` in `scripts/generators/api-generator-route.ts` (already done for `sample-rest-app-v2`), then:

```bash
npm run docs:generate:api --workspace=scripts/generators   # writes docs/openapi/<app>.yaml for every app in APPS
npx redocly lint docs/openapi/*.yaml                       # validate
npx redocly build-docs docs/openapi/sample-rest-app-v2.yaml --output generated/sample-rest-app-v2.html   # optional static HTML
```

One file per app, named after the app's folder — never one merged file across apps. Never hand-edit the YAML; regenerate it.

## Do / Don't

**Do**
- Build `responses` from the actual `throw` sites in the route's own controller/service/repository files, cross-checked against the `AppError.ts` table.
- Always include `500 INTERNAL_ERROR`; include `400 INVALID_JSON` on every body-accepting route and `422 VALIDATION_ERROR` on every `validate()`-wrapped route.
- Reuse `ErrorResponseSchema` and `ApiResponseSchema` from `common/schemas/` instead of redefining envelopes per app.
- Generate the `**Possible errors:**` list from the hoisted `responses` object, and put one realistic curl in every description.
- Add `.meta({ override: { format: 'date-time' } })` to every `z.date()` / `z.coerce.date()` field.

**Don't**
- Don't document an app through `generate-openapi.ts` — that's for `db/*` CRUD and `common/schemas`.
- Don't document only the happy path, or assume a failed lookup is always `404`.
- Don't mount a live docs UI in an app, or describe one as existing — none is wired today.
- Don't document the domain model — document the response DTO (`orderResponseDataSchema` deliberately omits `internalRiskScore`).
- Don't build a spec for an app with no HTTP business surface just for coverage.

## Applying this to the apps in this repo today

### `sample-rest-app-v2` — first app to onboard

The clean-architecture reference REST app: Express 5, `strict: true`, port default `3200`, routes mounted at `/orders` (`src/index.ts`), no auth middleware (so no `401` yet — add it if `authUser` is ever wired in). Reachable statuses, traced from the code:

| Operation | Statuses | Why |
|---|---|---|
| `POST /orders` | 201, 400, 422, 500 | `express.json()` → `INVALID_JSON`; `validate('body', createOrderBodySchema)` → 422; `repositories/external/exchange-rate.repository.ts` catches its own failures and returns `null` (no error status); DB failure → 500 |
| `GET /orders/:id` | 200, 404, 422, 500 | `validate('params', orderIdParamsSchema)` → 422; `services/orders.service.ts` throws `NotFoundError(\`Order ${id}\`)` → 404; DB failure → 500 |

To do: add `.meta({ id })` where wanted in `src/dto/order.dto.ts`, create `src/openapi.ts` per the template above, then run `docs:generate:api`. This is implementation work outside this skill's setup.

### Apps that don't get a spec here

- `cron` — HTTP-triggered jobs behind a separate `CRON_API_KEY` bearer scheme, not a business API. Optional if someone needs it.
- `sample-a2a-mcp-rag` and its older sibling — MCP (StreamableHTTP) and A2A protocol endpoints, not REST; they have their own discovery documents (`/.well-known/agent.json`, MCP tool listings).
- Queue consumers and anything else exposing only `/health`.
- `sample-api` / `base-iam` — routes come largely from `@db/<schema>` CRUD (documented via `db/<schema>/openapi/openapi.yaml`); hand-written routes there could be onboarded later with their own `src/openapi.ts`.

## References

- `scripts/generators/api-generator-route.ts` — the per-app generator loop (`APPS`, output path).
- `scripts/generators/generate-openapi.ts` + `scripts/generators/README.md` — the generic CLI for `db/*` and `common/schemas`.
- `common/compiled/node/errors/AppError.ts`, `error.middleware.ts`, `validate.ts` — the status/code table, `INVALID_JSON`, the 500 fallback, and the 422 production point.
- `common/schemas/error.schema.ts`, `common/schemas/api-response.schema.ts` — the shared error and `{ message, data }` schemas.
- `common/compiled/node/express/requestId.ts` — `x-request-id` read/echo.
- `apps/sample-rest-app-v2/src/` — `dto/order.dto.ts`, `routes/orders.routes.ts`, `controllers/orders.controller.ts`, `services/orders.service.ts`, `repositories/`.
- `docs/openapi/README.md` — the output folder for per-app specs.
- `.claude/skills/clean-architecture/SKILL.md` — DTO vocabulary and the response-envelope rule.
- `.github/skills/api-docs-generator/SKILL.md` — unrelated skill that writes Markdown API reference docs.
