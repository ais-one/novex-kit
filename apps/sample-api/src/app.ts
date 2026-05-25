import * as rbac from '@common/node/auth/rbac';
import * as store from '@common/node/auth/store';
import * as commsTenant from '@common/node/comms/tenant/resolver';
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
commsTenant.configure({ tenantCommsConfig });

logger.info(`Starting...`);
const { app, express, server } = preRoute();
await services.start(app, server);

commsTenant.setup('drizzle1', services.get);

if (!store.isConfigured()) throw new Error('store.configure() was not called — users table missing');
if (!rbac.isConfigured()) throw new Error('rbac.configure() was not called — IAM tables missing');
if (!dbAudit.isConfigured()) throw new Error('dbAudit.configure() was not called — hardDeleteLog table missing');
if (!commsTenant.isConfigured())
  throw new Error('commsTenant.configure()/setup() was not called — tenant comms config missing');

apiRoutes({ app }); // TODO route prefix & versioning
postRoute(app, express);

export { server };
