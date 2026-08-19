import { validate } from '@common/node/errors/validate';
import { Router } from 'express';
import { getOrder, postOrder } from '../controllers/orders.controller.ts';
import { createOrderBodySchema, orderIdParamsSchema } from '../dto/order.dto.ts';

export const ordersRouter = Router({ caseSensitive: true });

ordersRouter.post('/', validate('body', createOrderBodySchema), postOrder); // POST /orders
ordersRouter.get('/:id', validate('params', orderIdParamsSchema), getOrder); // GET /orders/:id
