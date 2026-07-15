import '@common/node/logger';
import '@common/node/config';

import { server } from './app.ts';

if (process.env.NODE_ENV === 'development') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { API_PORT, HTTPS_CERTIFICATE, NODE_ENV } = process.env;
server.listen(API_PORT, () => logger.info(`Env=${NODE_ENV}, Port=${API_PORT}, https=${Boolean(HTTPS_CERTIFICATE)}`));
