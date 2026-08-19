import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { convertUsdCentsToEurCents } from '../../repositories/external/exchange-rate.repository.ts';

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
      context: { requestId: 'test-req', layer: 'repository' as const, fn: 'test' },
    },
  };
};

describe.only('repositories/external/exchange-rate.repository', () => {
  it.only('converts USD cents to EUR cents using the provider response, forwarding the requestId header', async t => {
    let capturedHeaders: Record<string, string> | undefined;
    t.mock.method(globalThis, 'fetch', async (_url: string, options?: { headers?: Record<string, string> }) => {
      capturedHeaders = options?.headers;
      return {
        ok: true,
        json: async () => ({ amount: 1, base: 'USD', date: '2026-01-01', rates: { EUR: 0.9 } }),
      };
    });

    const { logger: log } = fakeLog();
    const result = await convertUsdCentsToEurCents(10_000, log);

    assert.equal(result, 9000);
    assert.equal(capturedHeaders?.['x-request-id'], 'test-req');
  });

  it.only('returns null and logs a warning when the provider responds with a non-OK status', async t => {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503, json: async () => ({}) }));

    const { calls, logger: log } = fakeLog();
    const result = await convertUsdCentsToEurCents(10_000, log);

    assert.equal(result, null);
    assert.equal(calls[0]?.level, 'warn');
  });

  it.only('returns null and logs a warning when the provider response fails schema validation', async t => {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ unexpected: 'shape' }) }));

    const { calls, logger: log } = fakeLog();
    const result = await convertUsdCentsToEurCents(10_000, log);

    assert.equal(result, null);
    assert.equal(calls[0]?.level, 'warn');
  });
});
