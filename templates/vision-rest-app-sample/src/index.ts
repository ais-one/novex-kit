import '@common/node/logger'; // Initialize global logger
import '@common/node/config'; // Load .env / .env.json into globalThis.__config

import { auditContext } from '@apps/vision-common/express/audit/audit-context.ts';
import { errorHandler, notFoundHandler } from '@common/node/errors/error.middleware';
import { requestIdMiddleware } from '@common/node/express/requestId';
import { healthRouter } from '@common/node/health/router';
import { loggerMiddleware } from '@common/node/logger';
import express from 'express';
import { closeDb, getDb, openDb } from './repositories/data/db.ts';
import { ordersRouter } from './routes/orders.routes.ts';

const { API_PORT = '3200' } = process.env;

// This app's core job is reading/writing orders in PostgreSQL — unlike a best-effort side
// capability, there's no acceptable degraded mode without it. Fail fast and loudly here
// rather than starting an HTTP server that can't actually serve any request.
await openDb();

const app = express();
app.use(express.json());
app.use(requestIdMiddleware); // must run before loggerMiddleware — see common/node/express/preRoute.ts
app.use(loggerMiddleware);
// This sample has no auth middleware wired up, so req.user is always undefined and
// auditContext records app.current_user_id as '' — a real app runs its auth middleware here,
// before auditContext, so req.user is populated. See docs/design/pg-audit-implementation.md §6.
app.use(auditContext(getDb())); // attaches req.dbTransaction — every mutating route uses it
app.use('/health', healthRouter);
app.use('/orders', ordersRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(Number(API_PORT), () => {
  logger.info(`vision-rest-app-sample listening on port ${API_PORT}`);
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`vision-rest-app-sample received ${signal}, shutting down`);
  await closeDb();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
