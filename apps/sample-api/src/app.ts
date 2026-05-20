import * as rbac from '@common/node/auth/rbac';
import * as store from '@common/node/auth/store';
import * as dbAudit from '@common/node/db-audit';
import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import { users } from './database/schema.ts';
import { hardDeleteLog } from './database/schema-audit.ts';
import { permissions, rolePermissions, tenantRoles, tenants, userTenantRoles } from './database/schema-iam.ts';
import apiRoutes from './router.ts';

store.configure({ users });
rbac.configure({ permissions, rolePermissions, tenantRoles, tenants, userTenantRoles });
dbAudit.configure({ hardDeleteLog });

logger.info(`Starting...`);
const { app, express, server } = preRoute();
await services.start(app, server);
apiRoutes({ app }); // TODO route prefix & versioning
postRoute(app, express);

export { server };
