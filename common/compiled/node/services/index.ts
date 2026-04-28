import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import type { Application } from 'express';
import Wss from '../ws/index.ts';
import StoreOrm from './db/drizzle.ts';
import StoreKeyV from './db/keyv.ts';
import StoreKnex from './db/knex.ts';
import StoreRedis from './db/redis.ts';

// import '../auth/jwt.ts';

import type { ServiceConfig } from './types.ts';

let servicesConfig: Record<string, ServiceConfig> = {};
// biome-ignore lint/suspicious/noExplicitAny: service instances vary by type (StoreKnex | StoreRedis | StoreKeyV | Wss) with incompatible open() signatures
const services: Record<string, any> = {};

/** Start all configured services (DB, cache, WebSocket) based on SERVICES_CONFIG. */
const start = async (
  app: Application,
  server: HttpServer | HttpsServer,
  config = globalThis.__config?.SERVICES_CONFIG || {},
) => {
  try {
    servicesConfig = config;
    for (const [name, svc] of Object.entries(servicesConfig)) {
      const opts = globalThis.__config?.[svc.options];
      if (opts && svc.type === 'drizzle' && StoreOrm) services[name] = new StoreOrm(svc.options);
      if (opts && svc.type === 'knex' && StoreKnex) services[name] = new StoreKnex(svc.options);
      if (opts && svc.type === 'redis' && StoreRedis) services[name] = new StoreRedis(opts);
      if (opts && svc.type === 'keyv' && StoreKeyV) services[name] = new StoreKeyV(opts);
      if (opts && svc.type === 'ws' && Wss) services[name] = new Wss(opts);

      if (opts) {
        if (svc.type === 'ws') {
          services[name].open(server, app); // set server or get app object
        } else {
          services[name].open();
        }
      }
    }
  } catch (e) {
    logger.info(e);
  }
};

/** Gracefully stop all running services. */
const stop = async () => {
  logger.info('services - stop - begin');
  try {
    const promises = Object.keys(servicesConfig).map(name => services[name].close());
    await Promise.allSettled(promises);
  } catch (e) {
    logger.info(e.toString());
  }
  logger.info('services - stop - end');
};

/** Returns the underlying store instance for a named service, or null if not found. */
const get = (service: string) => services[service]?.get() || null;

/** Returns the current services configuration map. */
const list = () => servicesConfig;

export { get, list, start, stop };
