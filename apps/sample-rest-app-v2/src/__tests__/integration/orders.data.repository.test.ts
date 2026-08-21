// Integration test — connects to a real PostgreSQL instance via DATABASE_URL (see .env /
// .env.sample). This app's database is always PostgreSQL, never sqlite/mocked-only, so this
// tier exists specifically to verify the row <-> domain mapping against the real thing;
// orders.service.test.ts (unit tier) is what mocks this repository entirely.
import '@common/node/config'; // loads .env's DATABASE_URL into process.env
import '@common/node/logger';
import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import { closeDb, getDb, openDb } from '../../repositories/data/db.ts';
import { findOrderById, insertOrder } from '../../repositories/data/orders.repository.ts';

// Skipped when DATABASE_URL isn't set (e.g. no local Postgres running) instead of crashing in
// `before`. Everything, including the before/after hooks, must live inside the same describe —
// a root-level before/after would still run even when the inner describe is skipped.
const describeIfDb = process.env.DATABASE_URL ? describe.only : describe.skip;

describeIfDb('repositories/data/orders.repository (integration — real PostgreSQL)', () => {
  before(async () => {
    await openDb();
  });

  after(async () => {
    await closeDb();
  });

  // afterEach(async () => {
  //   await getDb()('orders').delete(); // keep the real table clean between test runs
  // });

  it.only('insertOrder persists an order and returns it with an assigned id', async () => {
    const order = await insertOrder(getDb(), {
      customerEmail: 'a@b.com',
      items: [{ sku: 'WIDGET', quantity: 2, unitPriceCents: 500 }],
      totalCents: 1000,
      totalEurCents: 920,
      internalRiskScore: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(typeof order.id, 'number');
    assert.ok(order.id > 0);
  });

  it.only('findOrderById round-trips the persisted order, mapping the row back to the domain shape', async () => {
    const inserted = await insertOrder(getDb(), {
      customerEmail: 'a@b.com',
      items: [{ sku: 'WIDGET', quantity: 2, unitPriceCents: 500 }],
      totalCents: 1000,
      totalEurCents: 920,
      internalRiskScore: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const found = await findOrderById(getDb(), inserted.id);

    assert.deepEqual(found, inserted);
  });

  it.only('findOrderById returns null for a missing id, not an error', async () => {
    assert.equal(await findOrderById(getDb(), 999_999), null);
  });
});
