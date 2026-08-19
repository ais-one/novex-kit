import '@common/node/logger';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { processSampleEvent, sampleEventSchema } from '../services/sample-event.service.ts';

const fakeLog = () => {
  const calls: Array<{ level: string; msg: string; meta?: Record<string, unknown> }> = [];
  return {
    calls,
    logger: {
      error: (msg: string, meta?: Record<string, unknown>) => calls.push({ level: 'error', msg, meta }),
      warn: (msg: string, meta?: Record<string, unknown>) => calls.push({ level: 'warn', msg, meta }),
      info: (msg: string, meta?: Record<string, unknown>) => calls.push({ level: 'info', msg, meta }),
      debug: (msg: string, meta?: Record<string, unknown>) => calls.push({ level: 'debug', msg, meta }),
      scope: () => fakeLog().logger,
      context: { requestId: 'test-req', layer: 'service' as const, fn: 'test' },
    },
  };
};

describe.only('sample-event.service', () => {
  it.only('sampleEventSchema accepts a valid event and defaults payload to {}', () => {
    const event = sampleEventSchema.parse({ id: 'evt-1', occurredAt: '2026-01-01T00:00:00Z' });
    assert.deepEqual(event, { id: 'evt-1', occurredAt: '2026-01-01T00:00:00Z', payload: {} });
  });

  it.only('sampleEventSchema rejects a non-ISO occurredAt', () => {
    assert.throws(() => sampleEventSchema.parse({ id: 'evt-1', occurredAt: 'not-a-date' }));
  });

  it.only('processSampleEvent logs the sample-event.processed domain event via the injected logger', async () => {
    const { calls, logger: log } = fakeLog();
    await processSampleEvent({ id: 'evt-1', occurredAt: '2026-01-01T00:00:00Z', payload: {} }, log);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].level, 'info');
    assert.equal(calls[0].msg, 'sample-event.processed');
    assert.equal(calls[0].meta?.eventId, 'evt-1');
  });
});
