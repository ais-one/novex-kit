import '@common/node/logger';
import '@common/node/config';
import { server } from './app.ts';

const { API_PORT, NODE_ENV } = process.env;
server.listen(API_PORT, () => logger.info(`Env=${NODE_ENV}, Port=${API_PORT}`));
