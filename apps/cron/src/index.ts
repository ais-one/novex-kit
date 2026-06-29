// Load config (reads .env.json and sets globalThis.__config)
import '@common/node/config';
import { configure as configureOutbox, startBroadcastWorker } from '@common/node/comms/service/outbox';
import { init as initComms } from '@common/node/comms/service/send';
import { logger } from '@common/node/logger';
import * as services from '@common/node/services';
import { commsOutbox, tenantCommsConfig } from '../../sample-api/src/database/schema-iam.ts';

logger.info('Starting cron worker...');

// Start services (pass null for app/server — cron has no Express)
await services.start(null as any, null as any);

// Initialize comms service (for credential resolution)
initComms({ table: tenantCommsConfig, serviceName: 'drizzle1', lookup: services.get });

// Configure outbox
configureOutbox({ commsOutbox }, 'drizzle1', services.get);

// Wait a bit for DB connection to be fully ready
await new Promise(resolve => setTimeout(resolve, 1000));

// Start the broadcast worker
const stop = await startBroadcastWorker();

logger.info('Cron worker started. Press Ctrl+C to stop.');

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Stopping cron worker...');
  stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Stopping cron worker...');
  stop();
  process.exit(0);
});
