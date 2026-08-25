import { createLogger } from '@common/node/logging/context';
import type { Request, Response } from 'express';
import type { CreateOrderBody } from '../dto/order.dto.ts';
import { toOrderResponseData } from '../dto/order.dto.ts';
import { createOrder, getOrderById } from '../services/orders.service.ts';

/**
 * Thin HTTP adapter: request input is already validated/coerced by `validate()` in
 * `routes/orders.routes.ts` before this runs. Opens the audit-scoped transaction via
 * `req.dbTransaction()` (attached by `@apps/sample-common/express/audit/audit-context` in
 * `src/index.ts` — see docs/design/pg-audit-implementation.md §6) and hands it to one service
 * method, which maps the domain model it returns into the `{ message, data }` response DTO —
 * never sends the domain model itself. Errors thrown by the service propagate to Express 5's
 * automatic async error forwarding → `common/node/errors/error.middleware.ts`; no try/catch
 * needed here.
 */
export const postOrder = async (req: Request, res: Response): Promise<void> => {
  const log = createLogger(logger, { requestId: req.requestId, layer: 'controller', fn: 'postOrder' });
  const body = req.body as CreateOrderBody;
  const order = await req.dbTransaction(trx =>
    createOrder(trx, body, log.scope({ layer: 'service', fn: 'createOrder' })),
  );
  res.status(201).json({ message: 'Order created', data: toOrderResponseData(order) });
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const log = createLogger(logger, { requestId: req.requestId, layer: 'controller', fn: 'getOrder' });
  const { id } = req.params as unknown as { id: number };
  const order = await req.dbTransaction(trx =>
    getOrderById(trx, id, log.scope({ layer: 'service', fn: 'getOrderById' })),
  );
  res.json({ message: 'Order found', data: toOrderResponseData(order) });
};
