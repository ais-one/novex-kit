import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLogger } from '../logging/context.ts';

describe.only('logging/context', () => {
  it.only('merges context into every log call, with context winning over a colliding meta key', () => {
    const calls: Array<{ level: string; msg: string; meta: unknown }> = [];
    const base = {
      error: (msg: unknown, meta?: unknown) => calls.push({ level: 'error', msg: String(msg), meta }),
      warn: (msg: unknown, meta?: unknown) => calls.push({ level: 'warn', msg: String(msg), meta }),
      info: (msg: unknown, meta?: unknown) => calls.push({ level: 'info', msg: String(msg), meta }),
      debug: (msg: unknown, meta?: unknown) => calls.push({ level: 'debug', msg: String(msg), meta }),
    };
    const log = createLogger(base, { requestId: 'req-1', layer: 'service', fn: 'buildReport' });

    log.info('report.generated', { reportId: 42, layer: 'should-not-win' });

    assert.deepEqual(calls, [
      {
        level: 'info',
        msg: 'report.generated',
        meta: { reportId: 42, layer: 'service', requestId: 'req-1', fn: 'buildReport' },
      },
    ]);
  });

  it.only('scope() derives a child logger with the same requestId and an overridden layer/fn', () => {
    const calls: Array<{ meta: unknown }> = [];
    const base = {
      error: () => {},
      warn: () => {},
      info: (_msg: unknown, meta?: unknown) => calls.push({ meta }),
      debug: () => {},
    };
    const log = createLogger(base, { requestId: 'req-1', layer: 'controller', fn: 'getReport' });
    const child = log.scope({ layer: 'repository', fn: 'findReportRecord' });

    child.info('slow query', { durationMs: 600 });

    assert.deepEqual(calls, [
      { meta: { durationMs: 600, requestId: 'req-1', layer: 'repository', fn: 'findReportRecord' } },
    ]);
  });

  it.only('each log level forwards to the matching base method', () => {
    const seen: string[] = [];
    const base = {
      error: () => seen.push('error'),
      warn: () => seen.push('warn'),
      info: () => seen.push('info'),
      debug: () => seen.push('debug'),
    };
    const log = createLogger(base, { requestId: 'r', layer: 'service', fn: 'x' });
    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');
    assert.deepEqual(seen, ['error', 'warn', 'info', 'debug']);
  });
});
