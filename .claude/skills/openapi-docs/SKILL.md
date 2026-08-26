---
name: openapi-docs
description: Guidance for generating per-app OpenAPI specs from this repo's existing zod DTOs (via zod-openapi's .meta({id}) + createDocument()) and publishing them behind one long-lived, multi-spec Swagger UI portal — so each REST app under apps/* is visually segregated (its own title, its own servers/base path, picked via a dropdown) while the portal itself never needs to change or redeploy when a new app is onboarded. Every operation must document every status code its controller→service→repository chain can actually produce — success plus every AppError subclass, validation failure, and the generic 500 fallback, cross-checked against common/node/errors/AppError.ts — each with a realistic example payload and a copy-pasteable curl command written directly into the operation's description. By default, every operation's description also gets a generated `**Possible errors:**` list of every reachable status/code, and every `z.date()`/`z.coerce.date()` field gets an explicit `.meta({ override: { format: 'date-time' } })` — zod-openapi renders date schemas as a bare `string` with no format otherwise. Use when adding OpenAPI/Swagger documentation to a new or existing REST app (starting with vision-rest-audit), when annotating zod DTOs with .meta() for doc generation, when enumerating an endpoint's success/error responses, when extending or replacing scripts/generate-openapi.ts, or when wiring a new app into the shared docs portal/index. Not for apps with no HTTP business surface beyond the shared /health endpoint (e.g. vision-consumer-audit, a Kafka consumer — see Applying this to the apps in this repo today) and not for generating human-readable Markdown API references — see .github/skills/api-docs-generator for that unrelated Markdown-scraping skill.
---

# OpenAPI docs: per-app specs, one shared Swagger portal

## Usage

Invoke bare (`/openapi-docs`) for the full pattern. Invoke with an app name (`/openapi-docs vision-rest-audit`) to jump to that app's section under [Applying this to the apps in this repo today](#applying-this-to-the-apps-in-this-repo-today).

This assumes the DTO vocabulary from the `clean-architecture` skill (controller/service/repository, request vs. response DTOs) — read that first if you haven't. It builds directly on that skill's "Response DTO (recommended)" note: define a response DTO as a zod schema with `.meta({ id: '...' })` so the same schema is both the runtime shape and the documentation source.

## Why one portal instead of one Swagger UI per app

Apps in this repo are deployed as separate Docker images with no shared gateway or ingress (see `.github/workflows/deploy-cr.yml` — one image per `workflow_dispatch` run, selected by app name). Mounting a live Swagger UI inside each app's own Express process would mean docs consumers need a different URL per app, and "segregated but universal" would require building a reverse proxy that doesn't exist today.

Instead: each REST app **generates a static OpenAPI YAML file** from its own DTOs; a single, separately-deployed **docs portal** (static Swagger UI, listing specs via a dropdown) reads whichever files exist. Onboarding app #2, #3, etc. means publishing a new YAML file and adding one entry to an index — the portal's own code never changes. This also sidesteps prod's network isolation: the portal serves pre-rendered static specs, so it needs no live access to an isolated-network API to render documentation — only "Try it out" (disable it in prod) would.

## What already exists — build on this, don't duplicate it

- **`zod-openapi@^5.4.6`** and **`@scalar/express-api-reference@^0.9.13`** are already declared as dependencies of `@common/node` (`common/compiled/node/package.json`), transitively available to every app — but grep confirms **zero usage** anywhere in `apps/*` today. Nothing imports `createDocument`, calls `.meta(`, or mounts `@scalar/express-api-reference`. This skill is what actually wires them up.
- **`scripts/generate-openapi.ts`** is a real, working example of the intended mechanism (`zod-openapi`'s `createDocument()`, no monkey-patching, no separate registry object) — but it's hardcoded against **sample/template content**: `common/schemas/{auth,payment,notification,error}.schema.js`'s fictional `/api/v1/auth/*`, `/api/v1/payments*`, `/api/v1/notifications*` endpoints. It is not wired to any real app, and its single `document.paths` object assumes one merged spec for the whole repo — which is the opposite of the per-app segregation this skill asks for. Its `servers` block even labels `http://localhost:8080` as `"Local (via API Gateway)"`, describing a gateway that does not exist in this repo.
- **`npm run docs:validate`** (`npx redocly lint docs/openapi/openapi.merged.yaml`) and **`npm run docs:make-html`** (`npx @redocly/cli build-docs ...`) are real, reusable Redocly CLI invocations — reuse the tool, just point it at more files (see [Validation](#validation) below).
- **The portal shell is real** — `docs/openapi-portal/index.html`, vendored via `npm run docs:portal:vendor` (copies `swagger-ui-dist` into `docs/openapi-portal/vendor/`, gitignored as a build artifact) and previewable via `npm run docs:portal:serve`. It fetches `../openapi/index.json` at load, shows an explicit "No API specs published yet" empty state when that list is empty (true today), and has an `ALLOW_TRY_IT_OUT` flag for the public-vs-prod deployment distinction below. See `docs/openapi-portal/README.md`.
- **No app mounts a live Swagger UI, no per-app OpenAPI file exists yet, and `scripts/generate-openapi.ts` still needs rewriting** to loop over onboarded apps instead of its hardcoded sample document — `docs/openapi/index.json` currently exists only as an empty placeholder (`[]`). Everything else past this section is the target shape to build, same as `clean-architecture`'s "Applying this to the apps in this repo today" section describes target splits for apps that haven't been refactored yet.

## Response completeness: every status the code can actually produce, not just the happy path

An operation's `responses` object must include one entry per HTTP status the request can actually receive, derived by walking the exact controller → service → repository chain that route calls — never guessed generically from what the endpoint "feels like." This repo's error surface is small and fully enumerable from `common/compiled/node/errors/AppError.ts`:

| Class | statusCode | code | Thrown from |
|---|---|---|---|
| `AppError` (base) | 500 | `INTERNAL_ERROR` | any layer directly, or the generic-exception fallback below |
| `NotFoundError` | 404 | `NOT_FOUND` | a service/repository, when a single-resource lookup returns nothing |
| `ValidationError` | 422 | `VALIDATION_ERROR` | the `validate()` middleware (request-shape failures) **or** a service, for a business-rule failure — see the `source`-lookup example below |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | auth middleware, when a route has one |

Plus two paths that never go through an `AppError` subclass at all (`common/compiled/node/errors/error.middleware.ts`):
- **Malformed JSON body** (`entity.parse.failed`, special-cased ahead of the `AppError` check) → `400` / `INVALID_JSON` — applies to every route accepting a JSON body (`POST`/`PUT`/`PATCH`).
- **Any uncaught, non-`AppError` exception** — a DB driver error, a Kafka publish failure, anything nobody wrapped — falls through `normalizeError()`'s final branch → `500` / `INTERNAL_ERROR`, message replaced with `'An unexpected error occurred'` outside dev. **This is always reachable on every single operation** — a repository or service call can always fail unexpectedly. Document it unconditionally; an operation with only a `200` in its `responses` is incomplete, not simple.

Method, per operation:

1. Every route wrapped in `validate('body' | 'params' | 'query', schema)` (`common/compiled/node/errors/validate.ts`) gets a `422 VALIDATION_ERROR` entry — mechanical, not app-specific.
2. Grep `throw new` across the exact controller/service/repository files that route's handler calls (not the whole app) and add one response entry per distinct class/status found. **Don't assume a lookup failure is a 404.** `vision-rest-audit`'s `publishAuditEvent` service throws `ValidationError('Invalid source')` (`services/audit-events.service.ts:43`) when the request body's `source` key doesn't resolve to a known `audit_sources` row — that's **422, not 404**, because an unresolved reference in the *request* is modeled as a bad request, not a missing resource. Read the actual `throw` statement; don't infer the status from what the operation conceptually sounds like.
3. If the route sits behind `requireRole`/`requireFga`/`authUser` (check the route file and the app's `index.ts`), add `401 UNAUTHORIZED`. This repo has no `ForbiddenError`/403 subclass today — a 403 needs `new AppError(msg, 403, 'FORBIDDEN')` via the base class, and the response entry documents that literal code string since there's no dedicated subclass to point at.
4. Every route accepting a body adds `400 INVALID_JSON`.
5. Every operation, unconditionally, adds `500 INTERNAL_ERROR`.
6. A **list** endpoint that finds nothing returns `200` with an empty `items` array, never `404` — a `404` only ever comes from an explicit `NotFoundError` thrown by a single-resource lookup (`GET /events/:event_id`, never `GET /events`).

Every error response's `content` schema is the shared, already-real `common/schemas/error.schema.js`'s `ErrorResponseSchema` (`{ error: { code, message } }`, `.meta({ id: 'ErrorResponse' })`-tagged) — reused via `$ref` across every operation and every app, never redefined per app. (`scripts/generate-openapi.ts`'s current sample code actually imports this schema from the wrong file — `auth.schema.js`, which doesn't export it, a real latent bug — import it from `common/schemas/error.schema.js` directly, as the template below does.)

## Every error code must be visible directly in the operation's description, not just buried in `responses`

Completing the `responses` object (above) is necessary but not sufficient — by default, **always** also surface a `**Possible errors:**` list in the operation's own `description`, one bullet per non-2xx status with its real `code`. Do this unless the user has explicitly asked for something else.

This isn't cosmetic. `ErrorResponseSchema`'s `message` field carries its own schema-level `.meta({ example: '...' })` (`common/schemas/error.schema.js`), and every renderer we've checked (Scalar included) shows that shared, generic example whenever a reader expands the `ErrorResponse` field tree — regardless of which specific response (`404`, `422`, `500`, ...) they were actually looking at. A response-level `example`/`examples` on the media type object is real and correct in the spec, but it renders in a *different* UI element (the response body preview), one that isn't reliably visible without extra interaction. The only place a reader is guaranteed to see the actual reachable codes for *this* operation, with zero clicks, is the description's own Markdown — the same reasoning the [Curl examples](#curl-examples-copy-pasteable-embedded-in-the-operation-itself) section below already applies to request examples.

Mechanism — attach a real `code`/`message` example to every error response, then generate the description's error list from that same object so the two can never drift apart:

```ts
// apps/vision-rest-audit/src/openapi.ts
const errorExample = (code: string, message: string, details: unknown = null) => ({
  error: { code, message, ...(details !== null && { details }) },
});

const errorResponse = (description: string, example: ReturnType<typeof errorExample>) => ({
  description,
  content: { 'application/json': { schema: ErrorResponseSchema, example } },
});

// Use when one status has more than one distinct cause — OpenAPI allows only one entry per
// status code, so multiple causes become named `examples`, not multiple response entries.
const errorResponseExamples = (
  description: string,
  examples: Record<string, { summary: string; value: ReturnType<typeof errorExample> }>,
) => ({
  description,
  content: { 'application/json': { schema: ErrorResponseSchema, examples } },
});

const internalError = errorResponse('Unexpected server error', errorExample('INTERNAL_ERROR', 'An unexpected error occurred'));
const invalidJson = errorResponse('Malformed JSON in the request body', errorExample('INVALID_JSON', 'Malformed JSON in request body'));

// Loosely typed on purpose — only needs to tolerate the 200/202 success entries in the same
// responses object (which have neither `example` nor `examples`), never needs to match
// zod-openapi's own response types.
type DocumentedErrorResponse = {
  description: string;
  content?: Record<
    string,
    { schema?: unknown; example?: { error: { code: string } }; examples?: Record<string, { value: { error: { code: string } } }> }
  >;
};

// Pulls the `code` back out of whatever errorResponse()/errorResponseExamples() produced, so the
// bullet list can be generated instead of hand-written (hand-written is what drifts).
const codeOf = (response: DocumentedErrorResponse): string => {
  const media = response.content?.['application/json'];
  if (media?.example) return media.example.error.code;
  if (media?.examples) return [...new Set(Object.values(media.examples).map((e) => e.value.error.code))].join(' / ');
  return 'UNKNOWN';
};

const errorCodesSection = (responses: Record<number, DocumentedErrorResponse>): string =>
  [
    '',
    '**Possible errors:**',
    ...Object.entries(responses)
      .filter(([status]) => Number(status) >= 400)
      .map(([status, response]) => `- \`${status} ${codeOf(response)}\` — ${response.description}`),
  ].join('\n');

// Build the responses object once, as its own const, and feed it to BOTH places —
// the description's bullet list and the operation's actual `responses:` field.
const listAuditEventsResponses = {
  200: { description: 'Paginated audit events', content: { 'application/json': { schema: auditEventListResponseSchema } } },
  422: errorResponse('Request failed validation', errorExample('VALIDATION_ERROR', 'event_id: Invalid UUID')),
  500: internalError,
};

// ...inside the operation object:
description: [
  'Returns a paginated, filterable list of audit events.',
  errorCodesSection(listAuditEventsResponses),
  '',
  '**Example:**',
  '```bash',
  "curl -s 'http://localhost:3300/api/v1/audit/events?result=DENIED&page=1&limit=20'",
  '```',
].join('\n'),
responses: listAuditEventsResponses,
```

Renders as, e.g.:

> **Possible errors:**
> - `422 VALIDATION_ERROR` — Request failed validation
> - `500 INTERNAL_ERROR` — Unexpected server error

See `apps/vision-rest-audit/src/openapi.ts`'s real, complete version of `errorExample`/`errorResponse`/`errorResponseExamples`/`codeOf`/`errorCodesSection` and every operation's hoisted `*Responses` const — copy that file's pattern rather than re-deriving it.

## Date/datetime fields rendered as `string` need an explicit `format` override

By default, **always** check: does this DTO have a `z.date()` or `z.coerce.date()` field? If so, it needs a `format` override — don't rely on zod-openapi to infer one.

`zod-openapi@5.4.6` converts a Zod "date" schema to a bare OpenAPI `{ type: 'string' }` with **no** `format` at all — confirmed in its own schema-override logic (`case "date": ctx.jsonSchema.type = "string";`, no `format` assignment beside it). That means a field like `start_time: z.coerce.date().optional()` shows up in the generated docs as an unqualified `string`, indistinguishable from a free-text field, even though the actual DTO coerces and validates it as a real `Date` at runtime. This gap is specific to `z.date()`/`z.coerce.date()` — it does **not** affect `z.iso.datetime()` (used for response fields like `occurredAt`), since that's a Zod *string* schema with its ISO format already built in, which zod-openapi already renders correctly as `format: 'date-time'`.

Fix with zod-openapi's `override` meta option — a pure documentation-layer annotation; it changes nothing about runtime parsing, coercion, or validation:

```ts
// apps/vision-rest-audit/src/dto/v1/audit-event.dto.ts
start_time: z.coerce.date().optional().meta({ override: { format: 'date-time' } }),
end_time: z.coerce.date().optional().meta({ override: { format: 'date-time' } }),
```

Applies the same way to `audit-event-error.dto.ts`'s mirrored `start_time`/`end_time` query params — any future `z.date()`/`z.coerce.date()` field, request or response, gets the same override.

## Curl examples: copy-pasteable, embedded in the operation itself

Don't rely on Swagger UI's "Try it out" auto-generated request-snippets panel as the only curl example — it only appears after a user expands and interacts with the operation, and it's only populated with realistic values if every field already carries a schema `example`. Instead, write the curl command directly into the operation's own `description` as a fenced code block — `description` renders as Markdown in both Swagger UI and Redoc, so it's visible immediately with zero interaction, in either rendering target.

Rules for the curl itself, matching `.github/skills/api-docs-generator`'s existing "realistic fake data" rule so both doc mechanisms in this repo agree:

- Use the app's actual default port from its own `src/index.ts` (`vision-rest-audit` → `3300`, matching `API_PORT`'s fallback) as the example host — never a placeholder like `<host>`.
- Use realistic-looking example values everywhere a real request needs one — a real-shaped UUID for `event_id`, a real-looking key for `source` — never `"string"` or `"<value>"`.
- For `POST`/`PUT`/`PATCH`, include the full `-H 'Content-Type: application/json' -d '{...}'` body inline, using the exact field names and casing the DTO expects (`vision-rest-audit`'s request bodies are snake_case — see `createAuditEventBodySchema`).
- One curl per operation, demonstrating the successful call, is enough — it doesn't need to reproduce every error case; the response schemas already document what a client should branch on.

## Per-app spec generation

### 1. Annotate DTOs with `.meta({ id })`

Every zod schema that should appear in the docs gets a stable `id`, the same pattern `common/schemas/auth.schema.js` already uses. In `vision-rest-audit`, that means `src/dto/v1/audit-event.dto.ts` and `audit-event-error.dto.ts` — e.g.:

```ts
// src/dto/v1/audit-event.dto.ts
export const auditEventSummaryResponseSchema = z
  .object({
    eventId: z.uuid(),
    sourceId: z.string(),
    // ...
    occurredAt: z.iso.datetime(),
  })
  .meta({ id: 'AuditEventSummaryResponse' });
```

`.meta({ id })` is what lets `zod-openapi` emit this as a reusable `components.schemas.AuditEventSummaryResponse` and `$ref` it from every path that returns it, instead of inlining the shape at every use site.

### 2. One generator script per app, not a shared merged one

Add `src/openapi.ts` inside the app itself (colocated, not stuffed into root `scripts/generate-openapi.ts` alongside unrelated apps' paths):

```ts
// apps/vision-rest-audit/src/openapi.ts
import { createDocument } from 'zod-openapi';
import { ErrorResponseSchema } from '../../../common/schemas/error.schema.js';
import {
  auditEventAcceptedResponseSchema,
  auditEventDetailResponseSchema,
  auditEventSummaryResponseSchema,
  createAuditEventBodySchema,
  listAuditEventsQuerySchema,
} from './dto/v1/audit-event.dto.ts';
// ...import audit-event-error.dto.ts schemas the same way for /events/errors, /events/errors/{event_id}

const errorContent = { 'application/json': { schema: ErrorResponseSchema } };
const validationError = { description: 'Request failed validation', content: errorContent };
const internalError = { description: 'Unexpected server error', content: errorContent }; // always reachable — see Response completeness above

export const document = createDocument({
  openapi: '3.1.0',
  info: { title: 'Vision REST Audit API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3300', description: 'Local' }],
  paths: {
    '/events': {
      get: {
        tags: ['Audit Events'],
        summary: 'List audit events',
        description: [
          'Returns a paginated, filterable list of audit events. Never 404s — no matches is a 200 with an empty `items` array.',
          '',
          '**Example:**',
          '```bash',
          "curl -s 'http://localhost:3300/api/v1/audit/events?source_key=vision-mcp&result=DENIED&page=1&page_size=20'",
          '```',
        ].join('\n'),
        requestParams: { query: listAuditEventsQuerySchema },
        responses: {
          200: {
            description: 'Paginated audit events',
            content: { 'application/json': { schema: auditEventSummaryResponseSchema } },
          },
          422: validationError, // a query param fails zod — e.g. an invalid `result` enum value, a non-uuid `event_id`
          500: internalError,
        },
      },
      post: {
        tags: ['Audit Events'],
        summary: 'Record a new audit event',
        description: [
          'Accepts an event for async processing — 202 means queued, not yet persisted.',
          '',
          '**Example:**',
          '```bash',
          'curl -s -X POST http://localhost:3300/api/v1/audit/events \\',
          "  -H 'Content-Type: application/json' \\",
          '  -d \'{"event_id":"3fa85f64-5717-4562-b3fc-2c963f66afa6","feature_group":"reports","action":"report.generated","source":"vision-custom-api"}\'',
          '```',
        ].join('\n'),
        requestBody: { required: true, content: { 'application/json': { schema: createAuditEventBodySchema } } },
        responses: {
          202: {
            description: 'Accepted for async processing',
            content: { 'application/json': { schema: auditEventAcceptedResponseSchema } },
          },
          // `source` failing to resolve to a known audit_sources row is 422, NOT 404 — services/audit-events.service.ts:43
          // throws ValidationError('Invalid source'), treating an unresolved reference as a bad request, not a missing resource.
          422: {
            description: 'Request body failed validation, or `source` does not resolve to a known audit source',
            content: errorContent,
          },
          500: internalError, // e.g. the queue publish fails
        },
      },
    },
    '/events/{event_id}': {
      get: {
        tags: ['Audit Events'],
        summary: 'Get an audit event by ID',
        description: [
          'Returns full detail for one audit event, including before/after data and its source.',
          '',
          '**Example:**',
          '```bash',
          'curl -s http://localhost:3300/api/v1/audit/events/3fa85f64-5717-4562-b3fc-2c963f66afa6',
          '```',
        ].join('\n'),
        responses: {
          200: {
            description: 'Audit event detail',
            content: { 'application/json': { schema: auditEventDetailResponseSchema } },
          },
          422: validationError, // :event_id isn't a valid uuid
          404: { description: 'No audit event exists with this event_id', content: errorContent },
          500: internalError,
        },
      },
    },
  },
});
```

`audit-event-errors.routes.ts` follows the identical shape — `GET /events/errors` (list, same 422/500 pattern as `GET /events`) and `GET /events/errors/{event_id}` (`getAuditEventErrorByEventId` throws `NotFoundError` at `services/audit-event-errors.service.ts:33`, so it gets the same 200/422/404/500 set as `GET /events/{event_id}`). No route in `vision-rest-audit` currently has auth middleware attached, so none of them get a `401` yet — if `requireRole`/`requireFga`/`authUser` is added to a route later, add `401 UNAUTHORIZED` to that operation at the same time.

A small root script writes each app's `document` to its own file — this replaces `scripts/generate-openapi.ts`'s single hardcoded document with a loop over onboarded apps:

```ts
// scripts/generate-openapi.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';

const APPS = ['vision-rest-audit']; // add each app here as it's onboarded — see index below

for (const app of APPS) {
  const { document } = await import(`../apps/${app}/src/openapi.ts`);
  mkdirSync('docs/openapi', { recursive: true });
  writeFileSync(`docs/openapi/${app}.yaml`, yaml.dump(document, { lineWidth: 120 }));
}
```

Output convention: **`docs/openapi/<app-name>.yaml`, one file per app, filename matching the app's folder name** — never one merged file across apps. A merged file is exactly what re-introduces path collisions and makes "segregated by look" impossible.

### 3. The index the portal reads

`docs/openapi/index.json`, written by the same loop, drives the portal's dropdown without the portal needing any per-app knowledge baked in:

```json
[{ "name": "Vision REST Audit API", "file": "vision-rest-audit.yaml" }]
```

Regenerate it in the same script that writes the YAML files — never hand-maintain it separately, or it will drift from what's actually on disk.

### Validation

Point Redocly's lint at every file, not just one:

```bash
npx redocly lint docs/openapi/*.yaml
```

Keep `npm run docs:validate` as the entry point; only its glob target changes from the single `openapi.merged.yaml` to `docs/openapi/*.yaml`.

## The portal

Real, already built: `docs/openapi-portal/index.html` — a single static Swagger UI page that fetches `../openapi/index.json` at load time and builds its `urls` dropdown from the result:

```js
fetch('../openapi/index.json')
  .then((r) => r.json())
  .then((specs) => {
    window.ui = SwaggerUIBundle({
      urls: specs.map((s) => ({ url: `../openapi/${s.file}`, name: s.name })),
      'urls.primaryName': specs[0].name,
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
    });
  });
```

Because the dropdown list comes from `index.json` at runtime rather than being compiled into the page, **onboarding app #2 never touches the portal's own code** — only `docs/openapi/*.yaml` and `index.json` change, both produced by the generation step above. `index.html` shows an explicit "No API specs published yet" message rather than a blank/broken Swagger UI when `index.json` is `[]` (the state today, before any app is onboarded).

This portal is documentation tooling, not a running app — it has no build step of its own beyond `npm run docs:portal:vendor` (copies `swagger-ui-dist`'s CSS/JS into `docs/openapi-portal/vendor/`, gitignored as a build artifact, not checked in), so it lives under `docs/openapi-portal/` rather than as a new `apps/*` workspace. It is never mounted inside `vision-rest-audit`'s own Express process (or any other app's) — keeping it out-of-process is what makes "universal" possible without a reverse proxy. Preview locally with `npm run docs:portal:serve` (serves all of `docs/`, not just this folder — the relative `../openapi/index.json` fetch needs `openapi/` and `openapi-portal/` reachable as siblings, exactly as they'll be laid out once uploaded to a bucket) and open `http://localhost:5050/openapi-portal/`.

Deploying it fronting a prod server on the isolated network publicly? Flip `ALLOW_TRY_IT_OUT` to `false` at the top of `index.html`'s script — it gates `supportedSubmitMethods`, so "Try it out" is disabled without touching anything else.

## Deployment

Reuse the existing OSS/S3 upload mechanics from `.github/workflows/deploy-bucket.yml` (`ossutil`/AWS CLI steps), but as a **new** workflow rather than editing that one in place — `deploy-bucket.yml` is hard-coded to `apps/${{ inputs.app }}/dist` from a Vue `npm run build`, and this portal is neither a workspace app nor a Vite build. Per root `CLAUDE.md`'s protected-paths rule, name it with the `local-` prefix (e.g. `.github/workflows/local-deploy-docs.yml`) so it's a downstream-only workflow, preserved across upstream template syncs, uploading `docs/openapi/` (generated YAML + `index.json`) and `docs/openapi-portal/` (the static Swagger UI shell) to the target bucket.

Two buckets, same pipeline, different reachability — not different code:

- **Staging**: bucket left public, matching "probably will be kept public on stag."
- **Prod**: same generated artifacts, published to a bucket/path reachable only inside the isolated network (VPN, internal ALB, or simply not published if prod docs aren't required yet). Never point the portal's "Try it out" at a prod server URL from a publicly-reachable deployment of the portal — disable `supportedSubmitMethods: []` in the Swagger UI config for any public deployment, since static docs don't need live API access to render, but "Try it out" does.

## Do / Don't

**Do**

- Give every response DTO meant for docs a stable `.meta({ id })`, matching `common/schemas/*.schema.js`'s existing pattern.
- Generate one OpenAPI YAML per app, named after the app's own folder, under `docs/openapi/`.
- Regenerate `docs/openapi/index.json` from the same loop that writes the YAML files — never hand-edit it out of sync with what's on disk.
- Keep the portal's own code free of any per-app knowledge — it only ever reads `index.json`.
- Disable "Try it out" on any publicly-reachable deployment of the portal that fronts a prod server.
- Document every status code the actual controller→service→repository chain for that operation can produce, cross-checked against `common/compiled/node/errors/AppError.ts`'s table — not what "feels" right for the endpoint.
- Always include the generic `500 INTERNAL_ERROR` fallback on every operation — an uncaught exception is always possible.
- Give every operation a copy-pasteable curl command in its own `description`, using the app's real default port and realistic example data.
- By default, render a `**Possible errors:**` bullet list into every operation's `description`, generated from that operation's own `responses` object (`errorCodesSection()`) — a reader expanding the shared `ErrorResponse` schema's fields alone only ever sees that schema's generic example, never the actual per-response `code`.
- By default, give every `z.date()`/`z.coerce.date()` field `.meta({ override: { format: 'date-time' } })` — zod-openapi renders date schemas as a bare `string` with no `format` on its own.

**Don't**

- Don't add a new app's paths into `scripts/generate-openapi.ts`'s old hardcoded `document.paths` object — that recreates one shared, unsegregated spec.
- Don't mount `@scalar/express-api-reference` or `swagger-ui-express` live inside an app's own Express process as the primary docs surface — that defeats "one universal instance" and requires a gateway this repo doesn't have.
- Don't let the portal bake a specific app list into its HTML/JS — that means every onboarding is a portal redeploy instead of a file publish.
- Don't point a public portal's "Try it out" at a server sitting on the isolated prod network.
- Don't build an OpenAPI spec for an app with no HTTP business surface (see `vision-consumer-audit` below) just to have "full coverage" — there's nothing there to document.
- Don't assume a failed lookup is always a `404` — read the actual `throw` statement; some are deliberately `ValidationError`/422 (see the `source`-lookup example above).
- Don't skip the `500` response because it feels obvious — an operation documented with only its success status is incomplete.
- Don't rely solely on Swagger UI's auto-generated request-snippets panel as your only curl example — write one explicitly in the operation's `description`.
- Don't leave an operation's error codes only in the `responses` object — a `**Possible errors:**` list belongs in the `description` too, generated from that same `responses` object, not hand-typed separately.
- Don't leave a `z.date()`/`z.coerce.date()` field without `.meta({ override: { format: 'date-time' } })` — the generated docs will render it as an unqualified `string`, indistinguishable from free text.

## Applying this to the apps in this repo today

### `vision-rest-audit` — first real app to onboard

Express 5 + zod DTOs, no OpenAPI wiring yet. `src/dto/v1/audit-event.dto.ts` and `audit-event-error.dto.ts` already have clean, well-separated request/response schemas (`listAuditEventsQuerySchema`, `createAuditEventBodySchema`, `auditEventSummaryResponseSchema`, `auditEventDetailResponseSchema`, and the mirrored `*-error.dto.ts` schemas for the `/api/v1/audit/event-errors` routes) — exactly the shapes to add `.meta({ id })` to and reference from `src/openapi.ts` per the template above. Routes are mounted at `/api/v1/audit` (`src/index.ts`), covering `audit-events.routes.ts` and `audit-event-errors.routes.ts`. Its exact reachable status codes per route — including the `source`-lookup 422-not-404 case — are already enumerated in [Response completeness](#response-completeness-every-status-the-code-can-actually-produce-not-just-the-happy-path) above; use that as the literal `responses` object, not a re-derived guess. This is real implementation work and out of scope for setting up this skill — noted here so the target shape is unambiguous once picked up.

### `vision-consumer-audit` — nothing to document

A Kafka consumer (`src/consumers/audit-events.consumer.ts`), not a REST API. Its only Express usage is a `/health` liveness endpoint (`src/index.ts`, port default `3400`) — the same shared boilerplate (`@common/node/health/router`) every app in this repo already exposes, not a documented business API. It gets no entry in `docs/openapi/` and no row in `index.json`. If its Kafka contract (the `audit.events` topic schema it consumes, which `vision-rest-audit`'s `POST /events` publishes) is ever worth documenting, that's an **AsyncAPI** spec, not OpenAPI/Swagger — a distinct format and a distinct, not-yet-built skill.

### Future REST apps

Follow `vision-rest-audit`'s recipe: `.meta({ id })` on response DTOs → `src/openapi.ts` → add the app's name to the `APPS` list in `scripts/generate-openapi.ts` → `npm run docs:generate` produces the new YAML + updates `index.json` → publish via `local-deploy-docs.yml`. No step touches the portal's own HTML/JS.

## References

- Root `CLAUDE.md` → "Updating from upstream template" → protected paths (`local-` prefix convention for downstream-only workflows).
- `scripts/generate-openapi.ts` + `docs/openapi/README.md` — the real, working `zod-openapi`/`createDocument()` mechanism, currently pointed at sample content; this skill redirects it to per-app files.
- `common/schemas/{auth,payment,notification,error}.schema.js` — real precedent for `.meta({ id })` on a zod schema, sample/template content.
- `common/compiled/node/package.json` — where `zod-openapi` and `@scalar/express-api-reference` are already declared but unused.
- `common/compiled/node/errors/AppError.ts` — the real status-code/`code` table this skill's completeness rule is built from (`AppError`/`NotFoundError`/`ValidationError`/`UnauthorizedError`).
- `common/compiled/node/errors/error.middleware.ts` — the real `{ error: { code, message } }` envelope, the `INVALID_JSON` special case, and the generic-exception `500 INTERNAL_ERROR` fallback every operation must document.
- `common/compiled/node/errors/validate.ts` — the real `422 VALIDATION_ERROR` production point for every `validate()`-wrapped route.
- `common/schemas/error.schema.js` — the real, reusable `ErrorResponseSchema` every error response should `$ref` instead of redefining per app.
- `apps/vision-rest-audit/src/dto/v1/{audit-event,audit-event-error}.dto.ts` — the real DTOs to annotate first.
- `apps/vision-rest-audit/src/index.ts` — real route mount point (`/api/v1/audit`) the generated spec's `servers`/paths must match, and its `API_PORT` default (`3300`) used in the curl examples.
- `apps/vision-rest-audit/src/services/{audit-events,audit-event-errors}.service.ts` — real `throw new NotFoundError(...)`/`throw new ValidationError(...)` sites the completeness rule is traced from.
- `apps/vision-consumer-audit/src/index.ts` — real example of an app with no documentable HTTP surface.
- `docs/openapi-portal/{index.html,README.md}` — the real, already-built portal shell (empty-state handling, `ALLOW_TRY_IT_OUT` toggle, local-preview instructions).
- `docs/openapi/index.json` — currently a real but empty (`[]`) placeholder, updated by `docs:generate` once an app is onboarded.
- Root `package.json`'s `docs:portal:vendor` / `docs:portal:serve` scripts — real, working vendoring and local-preview commands for the portal.
- `.github/workflows/deploy-bucket.yml` — real OSS/S3 upload mechanics to adapt into a new `local-deploy-docs.yml`, not edit in place.
- `.claude/skills/clean-architecture/SKILL.md` — DTO vocabulary and the original `.meta({ id })` recommendation this skill builds on.
- `.github/skills/api-docs-generator/SKILL.md` — a separate, unrelated skill that scrapes source/OpenAPI into Markdown reference docs; not a substitute for this generation+portal mechanism.
- `apps/vision-rest-audit/src/openapi.ts` — the real, current `errorExample`/`errorResponse`/`errorResponseExamples`/`codeOf`/`errorCodesSection` implementation and every operation's hoisted `*Responses` const; copy this file's pattern, not the older inline-`responses` template further up this doc.
- `apps/vision-rest-audit/src/dto/v1/{audit-event,audit-event-error}.dto.ts` — real `start_time`/`end_time` fields carrying the `.meta({ override: { format: 'date-time' } })` fix.
- `node_modules/zod-openapi`'s schema-override logic (`case "date": ctx.jsonSchema.type = "string"`) — the real source of the missing-`format` gap; also documented in `node_modules/zod-openapi/README.md`'s `override` section.
