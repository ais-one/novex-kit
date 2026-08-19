import '@common/node/logger'; // Initialize global logger
import '@common/node/config'; // Load .env / .env.json into globalThis.__config

import { errorHandler, notFoundHandler } from '@common/node/errors/error.middleware';
import { requestIdMiddleware } from '@common/node/express/requestId';
import { healthRouter } from '@common/node/health/router';
import { loggerMiddleware } from '@common/node/logger';
import express from 'express';
import { startSampleEventConsumer, stopSampleEventConsumer } from './consumers/sample-event.consumer.ts';

const { HEALTH_PORT = '3100' } = process.env;

const app = express();
app.use(requestIdMiddleware); // must run before loggerMiddleware — see common/node/express/preRoute.ts
app.use(loggerMiddleware);
app.use('/health', healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(Number(HEALTH_PORT), () => {
  logger.info(`vision-queue-consumer health server listening on port ${HEALTH_PORT}`);
});

// The health server above must stay up even if the queue can't connect yet — don't let a
// startup failure here take down the process; MqKafka already logs the underlying cause.
try {
  await startSampleEventConsumer();
} catch (e) {
  logger.error(`vision-queue-consumer failed to start the queue consumer: ${String(e)}`);
}

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`vision-queue-consumer received ${signal}, shutting down`);
  await stopSampleEventConsumer();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
