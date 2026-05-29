import * as rbac from '@common/node/auth/rbac';
import * as store from '@common/node/auth/store';
import { init as initComms } from '@common/node/comms/service/send';
import * as dbAudit from '@common/node/db-audit';
import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import { users } from './database/schema.ts';
import { hardDeleteLog } from './database/schema-audit.ts';
import {
  permissions,
  rolePermissions,
  tenantCommsConfig,
  tenantRoles,
  tenants,
  userTenantRoles,
} from './database/schema-iam.ts';
import apiRoutes from './router.ts';

store.configure({ users });
rbac.configure({ permissions, rolePermissions, tenantRoles, tenants, userTenantRoles });
dbAudit.configure({ hardDeleteLog });

logger.info(`Starting...`);
const { app, express, server } = preRoute();
await services.start(app, server);

initComms({ table: tenantCommsConfig, serviceName: 'drizzle1', lookup: services.get });

if (!store.isConfigured()) throw new Error('store.configure() was not called — users table missing');
if (!rbac.isConfigured()) throw new Error('rbac.configure() was not called — IAM tables missing');
if (!dbAudit.isConfigured()) throw new Error('dbAudit.configure() was not called — hardDeleteLog table missing');

apiRoutes({ app }); // TODO route prefix & versioning
postRoute(app, express);

export { server };
