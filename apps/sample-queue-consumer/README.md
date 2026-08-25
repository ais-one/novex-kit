# sample-queue-consumer

Sample Kafka consumer — a reference implementation for building a **dedicated, independently deployable** queue consumer app. Copy this app's shape for the next consumer; don't add consuming logic to an existing HTTP API.

## Why a separate app

A queue consumer is a long-running process, not a request/response call — it shouldn't share a deployment unit, scaling policy, or failure blast radius with an HTTP API. This app has its own `package.json`, starts its own process, and can be deployed/restarted/scaled independently of any other app in this repo. See `apps/sample-common/services/mq/README.md` for the full reasoning.

## Structure

```
src/
  index.ts                                 — bootstrap: logger/config, health server, start the consumer
  consumers/sample-event.consumer.ts       — "controller": parses/validates the raw message, calls the service
  services/sample-event.service.ts         — business logic + the event's zod schema/type
  repositories/external/queue.repository.ts — the only file that touches MqKafka directly
  __tests__/                               — unit tests; repository and service are mocked via mock.module()
```

This follows the same controller → service → repository layering as HTTP apps in this repo (see `.claude/skills/clean-architecture/SKILL.md`), adapted for a message trigger instead of an HTTP request: the queue callback plays the controller's role instead of a route handler.

## Running locally

1. A local Kafka broker on `localhost:9092` (e.g. `docker-compose` per `docs/archive/backend.md`, or the mock in `scripts/service-mocks`).
2. `npm run start` — connects, subscribes to the topic in `.env.json`'s `QUEUE_CONFIG.topic` (default `sample.events`), and serves `/health` and `/health/ready` on `HEALTH_PORT` (default `3100`).

If the broker isn't reachable, the app still starts (the health server comes up regardless) and logs a connection error — it does not crash. This is deliberate: see `MqKafka.open()` in `apps/sample-common/services/mq/kafka.ts`.

## Building a real consumer from this template

1. Replace `sample-event.service.ts`'s schema and `processSampleEvent` body with the real event shape and real business logic.
2. Rename `sample-event.consumer.ts` / `queue.repository.ts`'s exports to match, and point `QUEUE_CONFIG.topic`/`groupId` at the real topic.
3. If this consumer needs to call another app's shared logic, add it to `apps/sample-common` rather than duplicating it here.
