---
name: structured-logging
description: Guidance for structured, leveled, per-layer logging; error handling with preserved stack traces; and request/trace ID propagation across controller → service → repository and across calls to this repo's own other apps. Use when adding or reviewing logging in any controller, service, repository, MCP tool handler, or queue consumer; when an error is caught and needs to be logged or rethrown; when wiring a new app's entrypoint (request-ID middleware, error handler); or when a service calls another one of this repo's own apps and the call needs to carry trace context. Companion to the clean-architecture skill — read that first for the layer vocabulary (controller/service/repository) this document assumes. Not for choosing a logging library or bringing in a new dependency — this repo already has one; see below.
---

# Structured logging, tracing, and error handling

## Usage

Invoke bare (`/structured-logging`) for the full mechanism. This assumes the controller → service → repository vocabulary from the `clean-architecture` skill — read that first if you haven't.

## What already exists — build on this, don't duplicate it

This repo already has real, working pieces of this. The job here is to close the gaps between them and make the result consistent, not to introduce a new logging stack.

- **`common/compiled/node/logger.ts`** — the transport. A hand-rolled structured JSON logger (`error`/`warn`/`info`/`debug`), already stamping every entry with `timestamp` (ISO string), `level`, `message`, and `service` (`name@version`), filtered by the `LOG_LEVEL` env var. Set as the global `logger` — this document changes *how it's accessed* (injected, not global — see below), not what it is. Also exports `loggerMiddleware`, which already logs "request received" / "request completed" (with status + duration) for Express routes.
- **`common/compiled/node/errors/{AppError,error.middleware,types}.ts`** — the error hierarchy. `AppError` (base: `statusCode`, `code`, `details`, `isOperational`, calls `Error.captureStackTrace`) plus `NotFoundError`/`ValidationError`/`UnauthorizedError`. `errorHandler` is the central Express error middleware — already wired into real apps via `postRoute()` (confirmed in `apps/vision-custom-api/src/app.ts`) — normalizes any thrown value, logs 5xx errors with `stack` and `requestId: req.headers['x-request-id']`, and hides internals from the client in production.
- **`common/compiled/node/express/requestId.ts`** — `requestIdMiddleware` and the canonical `REQUEST_ID_HEADER` (`'x-request-id'`) constant. Generates one if the caller didn't send it, echoes it on the response, wired into `preRoute.ts` before `loggerMiddleware`. This closes what used to be a real gap: `error.middleware.ts` and `db-audit.ts` both already *read* `req.headers['x-request-id']` (the latter forwards it into a Postgres session variable for audit triggers — `app.session_id`), but nothing generated it if the client didn't send one. `apps/vision-rag/shared/tracing.ts` (an unwired prototype, not real running code) generates one under the wrong name, `x-correlation-id` — don't copy that; use `REQUEST_ID_HEADER`.
- **`common/compiled/node/logging/context.ts`** — `createLogger()` and the `ContextLogger` type — the injected-logger mechanism described below. Real, typechecked, unit-tested (`common/compiled/node/__test__/logging-context.test.ts`), and exercised end-to-end in `apps/vision-rest-app-sample`.

Do not introduce a new logging library (no `pino`, no `winston`) — `apps/vision-rag/shared/logger.ts` does that, but it's part of the same unwired prototype and duplicates what `common/node/logger.ts` already does, contradicting `docs/NOTES.md`'s "use native, avoid heavy libraries" direction.

## Log levels

Use the four levels `common/node/logger.ts` already implements — `error`, `warn`, `info`, `debug`, controlled by `LOG_LEVEL`:

- `error` — something failed and needs attention: an unhandled exception reaching a controller, a repository call that exhausted retries.
- `warn` — degraded but not failed: a slow query, a fallback path taken, a client error (4xx) in development.
- `info` — a notable, expected event: request received/completed, a service-layer domain event.
- `debug` — verbose detail only useful when actively investigating something; off by default.

## Per-layer logging responsibilities

Each layer logs a different *kind* of thing. This is as important as the mechanics — the most common mistake is a repository logging every successful query (noise that drowns out the failures worth seeing).

| Layer | Logs | Does NOT log |
|---|---|---|
| **Controller** (HTTP route, MCP tool handler, queue consumer — see `clean-architecture`'s per-transport note) | Request/call received; request/call completed, with status/duration; an unhandled error bubbling up from the service | Business logic details, successful DB calls |
| **Service** | Business-meaningful **domain events** — facts about what happened in the domain, not technical steps: `report.generated`, `sample-event.processed`, `user.deactivated` | Every internal step or branch; anything the repository already logs |
| **Repository** | Only **failures** and **slow-query warnings** (define a threshold, e.g. >500ms) | Every successful call — a repository that logs on every query makes the logs useless for finding the failures |

## Structured fields — the same shape on every log call

Every log call includes these fields, spelled exactly this way — consistency here is the point, not a suggestion:

```ts
{
  timestamp: string;   // ISO string — already automatic, common/node/logger.ts stamps this
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service: string;     // already automatic — "<npm_package_name>@<version>"
  layer: 'controller' | 'service' | 'repository'; // which of the three layers logged this
  fn: string;           // the function, route, or tool name that logged it — "where"
  requestId: string;    // ties every log for one unit of work together — see below
  // ...anything else relevant to this specific event (ids, counts, durations)
}
```

`layer` and `fn` are what satisfy "every log must say where it was created" — a bare `logger.info('done')` with no context is not acceptable under this convention; it should read as `logger.info('report generated', { layer: 'service', fn: 'buildReport', requestId, reportId })`.

## Request ID: generation and cross-app propagation

One `requestId` (a `crypto.randomUUID()` — native, no new dependency, matching what `vision-rag`'s prototype already reached for) is minted per unit of work and rides along through every layer and every log line for that unit of work:

1. **At the entry point** — an HTTP request, an MCP tool call, or a consumed queue message — read an incoming `x-request-id` if the caller already set one (this IS the propagation mechanism for a cross-app call), otherwise generate a new one with `crypto.randomUUID()`.
2. **Echo it back** — for an HTTP response, set the same value as an `x-request-id` response header (mirrors what `vision-rag/shared/tracing.ts` already attempts, corrected to the standardized header name).
3. **Attach it to the request/context** so the controller can read it — `req.requestId`, set by `common/compiled/node/express/requestId.ts`'s `requestIdMiddleware`, already wired into `preRoute.ts`. For a non-HTTP entry point (MCP tool call, queue message — see `apps/vision-queue-consumer/src/consumers/sample-event.consumer.ts`) there's no shared middleware to run; extract it from the message/input yourself the same way, with the same fallback to `crypto.randomUUID()`.
4. **Forward it on every outbound call to another one of this repo's own apps** — a `repositories/external/*.repository.ts` calling `vision-custom-api` from `vision-mcp`, or a producer setting it as a Kafka message header (`headers: { 'x-request-id': requestId }`) for a consumer to pick back up. This is the one thing `vision-rag/shared/http-client.ts` documents the *intent* for but never actually implements — its `internalRequest()` helper sets a `Content-Type` and an internal auth token on every call, but no trace header at all.

A `requestId` that never leaves the process it was minted in isn't tracing — the point is that a request into `vision-mcp` that triggers a call into `vision-custom-api` produces log lines in **both** apps carrying the **same** `requestId`, so an incident can be reconstructed across the process boundary.

## The logger is an injected dependency, not a global import

Every other file in this repo grabs the bare global `logger` (per `common/node/logger.ts`'s own module-load side effect and CLAUDE.md's "use the global logger" rule) — that convention stays for infrastructure code (`common/node/*`, one-off scripts). **Inside clean-architecture layers, it changes**: a service or repository never reaches for the bare global — it receives a logger as a parameter (idiom A) or a constructor dependency (idiom B), the same way it receives a repository. This is what makes `requestId`/`layer`/`fn` context automatic instead of something every call site has to remember to pass, and it's also what makes log output assertable in a test the same way a mocked repository call is.

Shape (a thin wrapper around the existing global `logger` — not a new transport), real and in use — `common/compiled/node/logging/context.ts`:

```ts
export type LogContext = { requestId: string; layer: 'controller' | 'service' | 'repository'; fn: string };

export type ContextLogger = {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  /** Derive a child logger with the same requestId, overriding layer/fn for the next hop. */
  scope(context: Partial<LogContext>): ContextLogger;
  /** Read-only — lets a repository forward `context.requestId` on an outbound call without a separate parameter. */
  readonly context: Readonly<LogContext>;
};

export function createLogger(base: BaseLogger, context: LogContext): ContextLogger { /* wraps base.*, merges context into every call's meta; context wins over a same-named meta key */ }
```

Usage — the controller mints the root scoped logger from `req.requestId`, then hands a re-scoped child down at each hop instead of letting the service/repository import anything global. This is the real, verified shape from `apps/vision-rest-app-sample`, not an illustrative sketch:

```ts
// controllers/orders.controller.ts
const log = createLogger(logger, { requestId: req.requestId, layer: 'controller', fn: 'postOrder' });
const order = await createOrder(body, log.scope({ layer: 'service', fn: 'createOrder' }));
res.status(201).json({ message: 'Order created', data: toOrderResponseData(order) });
```

```ts
// services/orders.service.ts
export const createOrder = async (body: CreateOrderBody, log: ContextLogger): Promise<Order> => {
  const totalEurCents = await convertUsdCentsToEurCents(
    totalCents,
    log.scope({ layer: 'repository', fn: 'convertUsdCentsToEurCents' }),
  );
  const order = insertOrder({ ...newOrder });
  log.info('order.created', { orderId: order.id, totalCents }); // the domain event
  return order;
};
```

```ts
// repositories/external/exchange-rate.repository.ts — reads context.requestId back out to forward it
const res = await fetch(url, { headers: { [REQUEST_ID_HEADER]: log.context.requestId } });
```

For idiom B (class-based, constructor-injected — see `clean-architecture`), the logger is just another constructor parameter next to the repository/service dependencies, defaulting to a real scoped instance the same way `ParserController` defaults its service parameter — and swappable for a spy/fake in tests the same way.

A subtlety hit while wiring this up: adding `context` to `ContextLogger` after `apps/vision-queue-consumer` already had a hand-written fake logger in its tests broke that fake's type (`context` was missing) — a reminder that a shared type used across workspaces needs every fake/mock updated in lockstep, and that re-running *every* affected workspace's typecheck after a shared-infra change (not just the one you're actively working in) is not optional.

## Stack traces and error handling

Build on `common/node/errors/*`, don't invent a parallel hierarchy (see `apps/vision-rag/shared/errors.ts` for what happens when you do — it duplicates `AppError` with less: no `cause` chaining, and it logs via raw `console.error`, which violates this repo's no-`console.*` rule):

- Throw an `AppError` subclass for expected failure modes (`NotFoundError`, `ValidationError`, `UnauthorizedError`, or a new subclass) from a service or repository. `AppError`'s constructor already calls `Error.captureStackTrace`.
- **When a layer wraps a lower-level error instead of just letting it propagate**, attach the original as `cause`: `throw new AppError('failed to build report', 500, 'REPORT_BUILD_FAILED', undefined, { cause: err })` (native `Error.cause` — no library needed). This is what "complete tracing from all layers" actually means in practice: the top-level log has the full chain (`err.stack` plus `err.cause?.stack`), not just the last layer's generic wrapper message.
- **Let errors bubble up rather than catching-and-logging at every layer.** A repository or service generally shouldn't both log an error AND rethrow it — that produces duplicate log lines for one failure. Log at the layer that either (a) is the last place with useful context before the error would otherwise be lost, or (b) is already the designated boundary — `error.middleware.ts`'s `errorHandler` is that boundary for HTTP; a queue consumer's top-level catch (see `apps/vision-queue-consumer/src/consumers/*.consumer.ts`'s `try`/`catch` around `handler`) is that boundary for a message. A repository logging a *slow-query warning* is different — that's not error propagation, it's the repository's own designated "warn" responsibility from the table above, and stands on its own.
- Include `requestId` on every error log, same as any other log line, so a failure can be correlated back to everything else that happened in that request/message.

## Naming convention checklist

Consistency is the actual requirement here, more than any specific name — pick these once, then never deviate:

- Header: always `x-request-id`. Not `x-correlation-id`, not `x-trace-id` — fix `vision-rag/shared/tracing.ts` to match when that prototype becomes real, rather than adding a third variant.
- Field names on every log call: `timestamp`, `level`, `message`, `service`, `layer`, `fn`, `requestId` — always these exact keys, never `reqId`/`req_id`/`trace`/`corrId` as alternates.
- Domain event names (service layer): lowercase, dot-separated, past tense — `resource.action`, e.g. `report.generated`, `sample-event.processed`, `user.deactivated`. Not `generateReport` (that's a function name, not an event) and not present tense.
- `layer` values: exactly `controller` / `service` / `repository` — the same three words `clean-architecture` uses, even for a non-HTTP entry point (an MCP tool handler or a queue consumer's message handler is still `layer: 'controller'` in this vocabulary).

## Gaps closed, and what's still open per app

Done: `common/compiled/node` now has the request-ID middleware, the injected-logger mechanism, and `cause`-chaining support in `AppError` (all real, typechecked, tested). `apps/vision-common`'s `MqKafka` was reviewed against this convention and deliberately left on the bare global logger — it's infrastructure (like `services/db/knex.ts`), not a service/repository, and has no per-request context to carry (a Kafka connection isn't scoped to one request). `apps/vision-queue-consumer`'s consumer/service were retrofitted: the consumer extracts/mints `requestId` from `message.headers[REQUEST_ID_MESSAGE_HEADER]` (see `apps/vision-common/services/mq/types.ts`), and the service takes an injected `ContextLogger`. `apps/vision-rest-app-sample` is the full reference example, verified end to end including a real cross-process trace (an `x-request-id` sent by a client shows up on the same value in both the request-received log and the `order.created` domain-event log).

Still open:

- **`apps/vision-custom-api`**: has `errorHandler`/`postRoute()` wired in for real and now gets `requestIdMiddleware` for free (it's in `preRoute.ts`), but `routes/leehung/*` itself hasn't been retrofitted to use an injected `ContextLogger` — it still calls the bare global `logger` inline in fat handlers, per the `clean-architecture` skill's rollout map for that app.
- **`apps/vision-mcp`**: no request-ID concept at all — a tool call has no equivalent of an HTTP request ID today. Each `registerTool` handler would need to mint or extract one from its input/headers, the same pattern `vision-queue-consumer`'s consumer now uses for a queue message.
- **`apps/vision-rag`**: `shared/tracing.ts` generates a request ID under the wrong header name; `shared/http-client.ts` never forwards it; `shared/errors.ts` duplicates `common/node/errors/*` with less functionality and a `console.error` call that violates the no-console rule. When this prototype is made real, replace all three with the canonical versions rather than fixing them in place.

## Do / Don't

**Do**

- Mint one `requestId` per unit of work and thread it through every layer and every outbound call to another of this repo's own apps.
- Let a service log a domain event once, in past tense, after the fact succeeded — not a running commentary of how it got there.
- Attach `cause` when wrapping an error, so the original stack survives to wherever it's actually logged.
- Pass the logger down as a parameter or constructor dependency.

**Don't**

- Don't log a repository's successful happy-path calls — only failures and slow-query warnings.
- Don't log the same error at more than one layer on its way up — log it once, at the boundary.
- Don't reach for the bare global `logger` inside a service or repository — that's for infrastructure code only under this convention.
- Don't invent a second header name or field spelling for the same concept — see the naming checklist.

## References

- `common/compiled/node/logger.ts` — the real structured-log transport this mechanism builds on; `loggerMiddleware` now logs `requestId`/`layer`/`fn` too.
- `common/compiled/node/express/requestId.ts` — the real request-ID middleware and `REQUEST_ID_HEADER` constant.
- `common/compiled/node/logging/context.ts` — the real `createLogger`/`ContextLogger` injected-logger mechanism, unit-tested in `common/compiled/node/__test__/logging-context.test.ts`.
- `common/compiled/node/errors/{AppError,error.middleware,validate,types}.ts` — the real, already-wired-in error hierarchy (now with `cause` support), central handler (now logs `requestId`/`layer`/`fn` and the cause chain), and the zod-validation middleware (now properly typed for strict-mode consumers).
- `common/compiled/node/db-audit.ts` — real precedent for propagating request context all the way to the database layer (`app.session_id` from `x-request-id`).
- `apps/vision-rest-app-sample` — full worked example: every rule in this document, exercised end to end (verified with a real HTTP boot, a real external API call, and a real cross-layer `requestId` trace visible in the logs) — start here over the inline snippets above if you want to see the whole thing wired together.
- `apps/vision-queue-consumer/src/consumers/sample-event.consumer.ts` — the non-HTTP variant: extracting/minting `requestId` from a queue message instead of an HTTP header.
- `apps/vision-rag/shared/{tracing,logger,http-client,errors}.ts` — an unwired prototype showing the right intent (correlation ID, pino-style structured logs, an internal HTTP client) with real gaps (wrong header name, no propagation, duplicated/console-based error handling) — useful as a cautionary example, not a template to copy as-is.
- `.claude/skills/clean-architecture/SKILL.md` — the layer vocabulary and mockability rules this document assumes.
- `.claude/agents/clean-architecture-reviewer.md` — also checks logging/tracing/error-handling compliance.
