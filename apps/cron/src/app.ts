import { configure as configureOutbox } from '@common/node/comms/service/outbox';
import { init as initComms } from '@common/node/comms/service/send';
import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import { commsOutbox, tenantCommsConfig } from './database/schema.ts';
import apiRoutes from './router.ts';

logger.info('Starting cron service...');

const { app, express, server } = preRoute();
await services.start(app, server);

// Comms outbox (DB + credential setup)
initComms({ table: tenantCommsConfig, serviceName: 'drizzle1', lookup: services.get });
configureOutbox({ commsOutbox }, 'drizzle1', services.get);

// Mount cron routes
apiRoutes({ app });

postRoute(app, express);

export { server };
