import * as rbac from '@common/node/auth/rbac';
import * as store from '@common/node/auth/store';
import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import { iamUsers, permissions, rolePermissions, tenantRoles, tenants, userTenantRoles } from '@db/iam/schema';
import apiRoutes from './router.ts';

store.configure({ users: iamUsers });
rbac.configure({ permissions, rolePermissions, tenantRoles, tenants, userTenantRoles });

logger.info(`Starting...`);
const { app, express, server } = preRoute();
await services.start(app, server);

if (!store.isConfigured()) throw new Error('store.configure() was not called — iamUsers table missing');
if (!rbac.isConfigured()) throw new Error('rbac.configure() was not called — IAM tables missing');

apiRoutes({ app });
postRoute(app, express);

export { server };
