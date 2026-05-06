// ? caution - avoid name clashes with native JS libraries, other libraries, other globals
import http from 'node:http';
import https from 'node:https';
import type { Duplex } from 'node:stream';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pathToRegexp from 'path-to-regexp';
import * as authService from '../auth/jwt.ts';
import * as shutdown from '../errors/shutdown.ts';
import { healthRouter } from '../health/router.ts';
import { loggerMiddleware } from '../logger.ts';
import * as services from '../services/index.ts';

/**
 * Bootstrap the Express app: registers security, CORS, body parsing middleware and starts services.
 * @returns The configured Express app, the express module, and the underlying HTTP(S) server.
 */
const preRoute = () => {
  const DEFAULT_STACK_TRACE_LIMIT = 3; // default limit error stack trace to 3 level
  const { STACK_TRACE_LIMIT = DEFAULT_STACK_TRACE_LIMIT } = process.env;

  // setup stacktrace limit
  Error.stackTraceLimit = Number(STACK_TRACE_LIMIT) || DEFAULT_STACK_TRACE_LIMIT;

  let server: http.Server | https.Server;
  shutdown.setup(
    () => server,
    () => services,
  ); // both resolved lazily — safe to call before server/services exist

  const { HTTPS_PRIVATE_KEY, HTTPS_CERTIFICATE, HTTPS_CA } = process.env;
  const https_opts: https.ServerOptions = {};
  if (HTTPS_CERTIFICATE) https_opts.cert = HTTPS_CERTIFICATE;
  if (HTTPS_PRIVATE_KEY) https_opts.key = HTTPS_PRIVATE_KEY;
  if (HTTPS_CA) https_opts.ca = HTTPS_CERTIFICATE;
  const app = express();
  server = HTTPS_CERTIFICATE ? https.createServer(https_opts, app) : http.createServer(app);

  // intercept upgrades before Express sees them
  server.on('upgrade', (req: http.IncomingMessage, socket: Duplex, _head: Buffer) => {
    // Let the WS server handle it — do nothing here if services.start sets up WS internally
    // This prevents Express middleware from touching upgrade requests
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.destroy();
    }
  });

  // SERVICES need server
  services.start(app, server);
  // setup authorization
  const { TOKEN_SERVICE_NAME = '', USER_SERVICE_NAME = '' } = globalThis.__config?.JWT ?? {};
  if (TOKEN_SERVICE_NAME && USER_SERVICE_NAME) {
    authService.setup(TOKEN_SERVICE_NAME, USER_SERVICE_NAME, services.get);
  }

  // with timeout handling: socket timeouts, client aborts, close connections, normal responses
  // and prevents duplicate logs
  app.use(loggerMiddleware); // HTTP Request and Websocket Related logging

  // skip middleware for WebSocket upgrade requests
  app.use((req, _res, next) => {
    // if (req.headers.upgrade?.toLowerCase() === 'websocket') return next('route');
    if (req.headers.upgrade?.toLowerCase() === 'websocket') return next(); // let WS server handle it
    next();
  });

  app.use('/health', healthRouter); // Mount before auth middleware — healthchecks must be unprotected

  // ------ SECURITY ------
  try {
    const helmetOptions = globalThis.__config?.HELMET_OPTIONS;
    if (helmetOptions) {
      if (helmetOptions.nosniff) app.use(helmet.noSniff());
      if (helmetOptions.xssfilter) app.use(helmet.xssFilter());
      if (helmetOptions.hideServer) app.use(helmet.hidePoweredBy());
      if (helmetOptions.csp) app.use(helmet.contentSecurityPolicy(helmetOptions.csp));
    }
    // app.use(helmet.noCache())
    // csurf not needed at the moment
  } catch (e) {
    logger.error('[helmet setup error]', e.toString());
    throw e;
  }

  // -------- CORS --------
  // Set CORS headers so client is able to communicate with this server
  // Access-Control-Allow-Origin=*
  // Access-Control-Allow-Methods=GET,POST,PUT,PATCH,DELETE,OPTIONS
  // Access-Control-Allow-Headers=Content-Type, Authorization
  try {
    const corsOptions = globalThis.__config?.CORS_OPTIONS;
    app.use(corsOptions ? cors(corsOptions) : cors()); // default { origin: '*' }
  } catch (e) {
    logger.error('[cors options error]', e.toString());
    throw e;
  }
  // additional response headers if CORS headers are missing
  try {
    const resHeadersAdd = globalThis.__config?.RES_HEADERS_ADD;
    if (Object.keys(resHeadersAdd)?.length) {
      app.use((_req, res, next) => {
        for (const key in resHeadersAdd) {
          if (!res.get(key)) res.set(key, resHeadersAdd[key]);
        }
        next();
      });
    }
  } catch (e) {
    logger.error('[response headers setup error]', e.toString());
    throw e;
  }

  // express-limiter, compression, use reverse proxy

  // ------ body-parser and-cookie parser ------
  const { BODYPARSER_JSON, BODYPARSER_URLENCODED, BODYPARSER_RAW_ROUTES = '' } = globalThis.__config;
  // client request body must match request content-type, if applicaion/json, body cannot be null/undefined
  try {
    app.use((req, res, next) => {
      const rawMatch = BODYPARSER_RAW_ROUTES?.split(',')?.find((route: string) =>
        pathToRegexp.match(route)(req.originalUrl),
      );
      if (rawMatch) {
        // raw routes - ignore bodyparser json
        next();
      } else {
        express.json(BODYPARSER_JSON || { limit: '2mb' })(req, res, next);
      }
    });
    app.use(express.urlencoded(BODYPARSER_URLENCODED || { extended: true, limit: '2mb' })); // https://stackoverflow.com/questions/29175465/body-parser-extended-option-qs-vs-querystring/29177740#29177740
  } catch (e) {
    logger.error('[bodyparser setup error]', e.toString());
    throw e;
  }
  app.use(cookieParser()); // need this for httpOnly cookie parsing

  // return this // this is undefined...
  return { app, express, server };
};

export default preRoute;
