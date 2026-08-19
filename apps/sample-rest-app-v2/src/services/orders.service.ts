import { NotFoundError } from '@common/node/errors/AppError';
import type { ContextLogger } from '@common/node/logging/context';
import type { Knex } from 'knex';
import type { CreateOrderBody, NewOrder, Order } from '../dto/order.dto.ts';
import { findOrderById, insertOrder } from '../repositories/data/orders.repository.ts';
import { convertUsdCentsToEurCents } from '../repositories/external/exchange-rate.repository.ts';

/** A crude, deterministic placeholder risk heuristic — replace with real fraud-scoring logic. */
const computeInternalRiskScore = (totalCents: number, itemCount: number): number => {
  if (totalCents > 100_000) return 80;
  if (itemCount > 10) return 40;
  return 5;
};

/**
 * Business logic for creating an order: compute the total and an internal risk score, enrich
 * with a EUR total via the external repository, persist via the data repository, then log the
 * domain event. No Express, no SQL, no fetch — everything here is testable with the two
 * repositories mocked. `log` is injected, not the bare global `logger`. `db` is whatever
 * `req.dbTransaction()` handed the controller — see docs/design/pg-audit-implementation.md §6.
 */
export const createOrder = async (db: Knex, body: CreateOrderBody, log: ContextLogger): Promise<Order> => {
  const totalCents = body.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const internalRiskScore = computeInternalRiskScore(totalCents, body.items.length);

  const totalEurCents = await convertUsdCentsToEurCents(
    totalCents,
    log.scope({ layer: 'repository', fn: 'convertUsdCentsToEurCents' }),
  );

  const newOrder: NewOrder = {
    customerEmail: body.customerEmail,
    items: body.items,
    totalCents,
    totalEurCents,
    internalRiskScore,
    createdAt: new Date().toISOString(),
  };

  const order = await insertOrder(db, newOrder);
  log.info('order.created', { orderId: order.id, totalCents, riskScore: internalRiskScore });
  return order;
};

/** Throws `NotFoundError` (404) for a missing order — an expected failure mode, not a bug. */
export const getOrderById = async (db: Knex, id: number, log: ContextLogger): Promise<Order> => {
  const order = await findOrderById(db, id);
  if (!order) throw new NotFoundError(`Order ${id}`);
  log.info('order.viewed', { orderId: id });
  return order;
};
