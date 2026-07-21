import '@common/node/logger';
import '@common/node/config';
import { server } from './app.ts';

const { API_PORT = '3101', NODE_ENV = 'development' } = process.env;
server.listen(Number(API_PORT), () => logger.info(`sample-botbuilder api running on ${API_PORT} (${NODE_ENV})`));
