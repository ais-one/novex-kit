import * as store from '@common/node/auth/store';
import { configure as configureOutbox } from '@common/node/comms/service/outbox';
import { init as initComms } from '@common/node/comms/service/send';
import * as dbAudit from '@common/node/db-audit';
import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import { commsOutbox, tenantCommsConfig, users } from './database/schema.ts';
import { hardDeleteLog } from './database/schema-audit.ts';
import apiRoutes from './router.ts';

store.configure({ users });
dbAudit.configure({ hardDeleteLog });

logger.info(`Starting...`);
const { app, express, server } = preRoute();
await services.start(app, server);

initComms({ table: tenantCommsConfig, serviceName: 'drizzle1', lookup: services.get });
configureOutbox({ commsOutbox }, 'drizzle1', services.get);

if (!dbAudit.isConfigured()) throw new Error('dbAudit.configure() was not called — hardDeleteLog table missing');

apiRoutes({ app }); // TODO route prefix & versioning
postRoute(app, express);

export { server };
