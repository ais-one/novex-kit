import '@common/node/logger';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { NewOrder, Order } from '../../dto/order.dto.ts';

const insertCalls: NewOrder[] = [];
const findResults = new Map<number, Order | null>();
const fakeDb = 'fake-knex-db' as unknown as import('knex').Knex;

mock.module('../../repositories/data/orders.repository.ts', {
  namedExports: {
    insertOrder: async (_db: unknown, order: NewOrder): Promise<Order> => {
      insertCalls.push(order);
      return { ...order, id: 1 };
    },
    findOrderById: async (_db: unknown, id: number): Promise<Order | null> => findResults.get(id) ?? null,
  },
});

let convertResult: number | null = 999;
const convertCalls: unknown[] = [];
mock.module('../../repositories/external/exchange-rate.repository.ts', {
  namedExports: {
    convertUsdCentsToEurCents: async (usdCents: number, log: unknown) => {
      convertCalls.push({ usdCents, log });
      return convertResult;
    },
  },
});

const { createOrder, getOrderById } = await import('../../services/orders.service.ts');

const fakeLog = () => {
  const calls: Array<{ level: string; msg: string; meta?: Record<string, unknown> }> = [];
  const build = (): import('@common/node/logging/context').ContextLogger => ({
    error: (msg, meta) => calls.push({ level: 'error', msg, meta }),
    warn: (msg, meta) => calls.push({ level: 'warn', msg, meta }),
    info: (msg, meta) => calls.push({ level: 'info', msg, meta }),
    debug: (msg, meta) => calls.push({ level: 'debug', msg, meta }),
    scope: () => build(),
    context: { requestId: 'test-req', layer: 'service', fn: 'test' },
  });
  return { calls, logger: build() };
};

describe.only('orders.service', () => {
  it.only('createOrder computes the total, enriches with a EUR total, and persists the mapped order', async () => {
    convertResult = 9200;
    const { calls, logger: log } = fakeLog();

    const order = await createOrder(
      fakeDb,
      {
        customerEmail: 'a@b.com',
        items: [
          { sku: 'WIDGET', quantity: 2, unitPriceCents: 5000 },
          { sku: 'GADGET', quantity: 1, unitPriceCents: 1000 },
        ],
      },
      log,
    );

    assert.equal(order.id, 1);
    assert.equal(order.totalCents, 11000); // 2*5000 + 1*1000
    assert.equal(order.totalEurCents, 9200);
    assert.equal(insertCalls.at(-1)?.totalCents, 11000);
    assert.ok(calls.some(c => c.msg === 'order.created' && c.meta?.orderId === 1));
  });

  it.only('createOrder still succeeds with a null EUR total when the exchange-rate lookup fails', async () => {
    convertResult = null;
    const { logger: log } = fakeLog();

    const order = await createOrder(
      fakeDb,
      { customerEmail: 'a@b.com', items: [{ sku: 'WIDGET', quantity: 1, unitPriceCents: 100 }] },
      log,
    );

    assert.equal(order.totalEurCents, null);
  });

  it.only('createOrder assigns a higher internal risk score for a large order, and never exposes it via toOrderResponseData', async () => {
    convertResult = null;
    const { logger: log } = fakeLog();

    const order = await createOrder(
      fakeDb,
      { customerEmail: 'a@b.com', items: [{ sku: 'WIDGET', quantity: 1, unitPriceCents: 200_000 }] },
      log,
    );

    assert.equal(order.internalRiskScore, 80);
    const { toOrderResponseData } = await import('../../dto/order.dto.ts');
    assert.ok(!('internalRiskScore' in toOrderResponseData(order)));
  });

  it.only('getOrderById returns the mapped order when found', async () => {
    findResults.set(42, {
      id: 42,
      customerEmail: 'x@y.com',
      items: [],
      totalCents: 0,
      totalEurCents: null,
      internalRiskScore: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const { logger: log } = fakeLog();

    const order = await getOrderById(fakeDb, 42, log);
    assert.equal(order.id, 42);
  });

  it.only('getOrderById throws a 404 NotFoundError when the order does not exist', async () => {
    findResults.set(404, null);
    const { logger: log } = fakeLog();

    await assert.rejects(
      () => getOrderById(fakeDb, 404, log),
      (err: unknown) => {
        const e = err as { statusCode: number; code: string };
        return e.statusCode === 404 && e.code === 'NOT_FOUND';
      },
    );
  });
});
