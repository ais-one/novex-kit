import '@common/node/logger';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { NotFoundError } from '@common/node/errors/AppError';
import { createRequest, createResponse } from '@common/node/tests/http-mocks';
import type { Request, Response } from 'express';
import type { Order } from '../../dto/order.dto.ts';

let createOrderResult: Order;
const createOrderCalls: unknown[] = [];
mock.module('../../services/orders.service.ts', {
  namedExports: {
    createOrder: async (trx: unknown, body: unknown, log: unknown) => {
      createOrderCalls.push({ trx, body, log });
      return createOrderResult;
    },
    getOrderById: async (_trx: unknown, id: number) => {
      if (id === 404) throw new NotFoundError(`Order ${id}`);
      return createOrderResult;
    },
  },
});

const { postOrder, getOrder } = await import('../../controllers/orders.controller.ts');

const asMockRequest = (overrides: Record<string, unknown>): Request => {
  const req = createRequest({ body: overrides.body as Record<string, unknown> }) as unknown as Request;
  req.requestId = 'test-request-id';
  if (overrides.params) req.params = overrides.params as Request['params'];
  // Stands in for `@apps/sample-common/express/audit/audit-context`'s `auditContext()` —
  // this controller-level unit test doesn't exercise the real Knex transaction wiring, only
  // that the controller opens `req.dbTransaction()` and forwards its `trx` to the service.
  req.dbTransaction = ((callback: (trx: unknown) => Promise<unknown>) =>
    callback('fake-trx')) as unknown as Request['dbTransaction'];
  return req;
};

describe.only('orders.controller', () => {
  it.only('postOrder responds 201 with the { message, data } envelope, never the raw domain model', async () => {
    createOrderResult = {
      id: 1,
      customerEmail: 'a@b.com',
      items: [{ sku: 'WIDGET', quantity: 1, unitPriceCents: 100 }],
      totalCents: 100,
      totalEurCents: 90,
      internalRiskScore: 80, // must NOT appear in the response
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const req = asMockRequest({ body: { customerEmail: 'a@b.com', items: [] } });
    const res = createResponse() as unknown as Response;

    await postOrder(req, res);

    assert.equal((res as unknown as ReturnType<typeof createResponse>)._getStatusCode(), 201);
    const json = (res as unknown as ReturnType<typeof createResponse>)._getJSONData() as {
      message: string;
      data: Record<string, unknown>;
    };
    assert.equal(json.message, 'Order created');
    assert.equal(json.data.id, 1);
    assert.ok(!('internalRiskScore' in json.data), 'internalRiskScore must never reach the response');
  });

  it.only('getOrder responds 200 with the { message, data } envelope for a found order', async () => {
    createOrderResult = {
      id: 2,
      customerEmail: 'x@y.com',
      items: [],
      totalCents: 0,
      totalEurCents: null,
      internalRiskScore: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const req = asMockRequest({ params: { id: 2 } });
    const res = createResponse() as unknown as Response;

    await getOrder(req, res);

    const json = (res as unknown as ReturnType<typeof createResponse>)._getJSONData() as { message: string };
    assert.equal(json.message, 'Order found');
  });

  it.only('getOrder propagates the NotFoundError from the service instead of catching it', async () => {
    const req = asMockRequest({ params: { id: 404 } });
    const res = createResponse() as unknown as Response;

    await assert.rejects(
      () => getOrder(req, res),
      (err: unknown) => (err as { statusCode: number }).statusCode === 404,
    );
  });
});
