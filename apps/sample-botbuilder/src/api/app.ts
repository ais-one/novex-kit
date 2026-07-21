import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import apiRoutes from './router.ts';

logger.info('Starting sample-botbuilder...');
const { app, express, server } = preRoute();
await services.start(app, server);
apiRoutes({ app });
postRoute(app, express);

export { server };
