import '@common/node/logger'; // Initialize global loggers
import '@common/node/config'; // loads .env.json → globalThis.__config; in production, inject secrets into process.env via your deployment platform before this runs

import { server } from './app.ts';

// if development && hostname == localhost allow TLS - call after config load
if (process.env.NODE_ENV === 'development') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { API_PORT, HTTPS_CERTIFICATE, NODE_ENV } = process.env;
server.listen(API_PORT, () => logger.info(`Env=${NODE_ENV}, Port=${API_PORT}, https=${Boolean(HTTPS_CERTIFICATE)}`));
