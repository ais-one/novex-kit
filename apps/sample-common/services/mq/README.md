# Message queue driver (shared by `apps/*`)

This lives in `sample-common`, not `common/`, because it's shared `apps/*` infrastructure, not template-wide — see `common/compiled/node/services/*` for the distinction (cross-app infra used by every app in the repo). Callers depend only on the `QueueDriver` contract in `types.ts`, never on a provider's SDK directly, so swapping the backend later means adding one new file and changing a config value, not touching every caller.

## Deployment principle: one dedicated app per consumer

**A queue consumer is never a side-feature bolted onto an existing app.** Each consumer gets its own app under `apps/`, with its own `package.json`, its own deployment/scaling, and its own lifecycle — so a slow or crashing consumer can never take down an unrelated HTTP API, and either can scale independently. `apps/sample-queue-consumer` is the reference example: copy its shape (`repositories/external/queue.repository.ts` → `services/*.service.ts` → `consumers/*.consumer.ts`) for the next one.

A producer (e.g. an existing API publishing an event) is different — it just calls `.publish()` inline from wherever the event happens, via its own `repositories/external/queue.repository.ts`. Only consuming needs the dedicated-app treatment, since consuming means a long-running process, not a request/response call.

## Current backend: Kafka (`kafka.ts`)

Wraps [kafkajs](https://kafka.js.org/). Each app that uses it instantiates and owns its own driver instance — there's no shared cross-app registry, since that would couple independently-deployed apps together. Configure via a `KAFKA_CONFIG` block in that app's `.env.json`:

```jsonc
// .env.json
"KAFKA_CONFIG": {
  "clientId": "sample-queue-consumer",
  "brokers": ["localhost:9092"],
  "sasl": { "mechanism": "plain", "username": "my-user" } // omit entirely if the broker needs no auth
}
```

If `sasl` is set, its password is **not** read from `.env.json` — set it in `.env` / the deployment platform as `KAFKA_CONFIG_SASL_PASSWORD`, per this repo's secrets convention.

```ts
import MqKafka from '@apps/sample-common/services/mq/kafka';

const mq = new MqKafka('KAFKA_CONFIG');
await mq.open(); // on app startup
// ...
await mq.close(); // on graceful shutdown
```

Local development: run the mocked broker in `scripts/service-mocks` (`@js-ak/kafkajs-mock` — no real broker needed) or a real broker via `docker-compose`, per `docs/archive/backend.md`. `apps/sample-common/services/mq/__tests__/unit/kafka.test.ts` shows the `mock.module()` pattern used to unit-test code that calls `MqKafka` without either.

## Adding another backend (e.g. SQS)

1. Create `services/mq/sqs.ts` exporting a default class implementing `QueueDriver` from `types.ts` (`open`, `close`, `publish`, `subscribe`, `get`). Use `kafka.ts` as the template for the open/close lifecycle and the `optionName → globalThis.__config` resolution pattern.
2. Add its config type to `types.ts` (e.g. `SqsConfig`), next to `KafkaConfig`.
3. In a consuming app, swap `import MqKafka from '@apps/sample-common/services/mq/kafka'` for `import MqSqs from '@apps/sample-common/services/mq/sqs'`, and point its config block at the new shape. Nothing that calls `.publish()`/`.subscribe()` needs to change — it only ever depended on `QueueDriver`.
