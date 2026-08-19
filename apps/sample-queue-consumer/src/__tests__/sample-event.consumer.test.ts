import '@common/node/logger';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { sampleEventSchema } from '../services/sample-event.service.ts';

type RawMessage = { value: Buffer; headers?: Record<string, string> };
type FakeLogContext = { requestId: string; layer: string; fn: string };

const repoState: { connected: number; handler: ((message: RawMessage) => Promise<void>) | null } = {
  connected: 0,
  handler: null,
};

mock.module('../repositories/external/queue.repository.ts', {
  namedExports: {
    connectQueue: async () => {
      repoState.connected += 1;
    },
    disconnectQueue: async () => {},
    subscribeToSampleEvents: async (handler: (message: RawMessage) => Promise<void>) => {
      repoState.handler = handler;
    },
  },
});

const processedCalls: Array<{ event: unknown; context: FakeLogContext }> = [];
mock.module('../services/sample-event.service.ts', {
  namedExports: {
    processSampleEvent: async (event: unknown, log: { __context: FakeLogContext }) => {
      processedCalls.push({ event, context: log.__context });
    },
    sampleEventSchema,
  },
});

// Captures exactly what createLogger was asked to scope to, without needing to intercept
// real log output — see the structured-logging skill's ContextLogger shape.
const createLoggerCalls: FakeLogContext[] = [];
const fakeContextLogger = (context: FakeLogContext) => ({
  __context: context,
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  scope: (next: Partial<FakeLogContext>) => fakeContextLogger({ ...context, ...next }),
});
mock.module('@common/node/logging/context', {
  namedExports: {
    createLogger: (_base: unknown, context: FakeLogContext) => {
      createLoggerCalls.push(context);
      return fakeContextLogger(context);
    },
  },
});

const { startSampleEventConsumer } = await import('../consumers/sample-event.consumer.ts');

describe.only('sample-event.consumer', () => {
  it.only('startSampleEventConsumer connects the queue and subscribes', async () => {
    await startSampleEventConsumer();
    assert.equal(repoState.connected, 1);
    assert.ok(repoState.handler);
  });

  it.only('the subscribed handler parses a valid raw message and calls the service with a scoped logger', async () => {
    await startSampleEventConsumer();
    const raw = JSON.stringify({ id: 'evt-2', occurredAt: '2026-01-01T00:00:00Z' });
    await repoState.handler?.({ value: Buffer.from(raw) });

    const call = processedCalls.at(-1);
    assert.deepEqual(call?.event, { id: 'evt-2', occurredAt: '2026-01-01T00:00:00Z', payload: {} });
    assert.equal(call?.context.layer, 'service');
    assert.equal(call?.context.fn, 'processSampleEvent');
  });

  it.only('the subscribed handler swallows an invalid message instead of calling the service or rejecting', async () => {
    await startSampleEventConsumer();
    const { handler } = repoState;
    assert.ok(handler, 'expected subscribe() to have captured a handler');
    const before = processedCalls.length;
    await assert.doesNotReject(() => handler({ value: Buffer.from(JSON.stringify({ id: 'evt-3' })) }));
    assert.equal(processedCalls.length, before);
  });

  it.only('mints a fresh requestId when the message carries no x-request-id header', async () => {
    await startSampleEventConsumer();
    const raw = JSON.stringify({ id: 'evt-4', occurredAt: '2026-01-01T00:00:00Z' });
    await repoState.handler?.({ value: Buffer.from(raw) });

    const controllerContext = createLoggerCalls.at(-1);
    assert.equal(typeof controllerContext?.requestId, 'string');
    assert.ok((controllerContext?.requestId.length ?? 0) > 0);
  });

  it.only('reuses an incoming x-request-id message header instead of minting a new one', async () => {
    await startSampleEventConsumer();
    const raw = JSON.stringify({ id: 'evt-5', occurredAt: '2026-01-01T00:00:00Z' });
    await repoState.handler?.({ value: Buffer.from(raw), headers: { 'x-request-id': 'upstream-trace-1' } });

    const controllerContext = createLoggerCalls.at(-1);
    assert.equal(controllerContext?.requestId, 'upstream-trace-1');
    assert.equal(controllerContext?.layer, 'controller');
    assert.equal(controllerContext?.fn, 'sampleEventConsumer');
  });
});
