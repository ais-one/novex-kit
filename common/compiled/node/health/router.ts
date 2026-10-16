// src/health/health.router.js
import { Router } from 'express';
import { liveness, readiness } from './controller.ts';

export const healthRouter = Router({ caseSensitive: true });

/**
 * GET /health/live
 * @summary Healthcheck endpoint
 * @tags health
 * @return {object} 200 - success response - application/json
 */
healthRouter.get('/', liveness); // GET /health
healthRouter.get('/live', liveness); // GET /health/live

/**
 * GET /health/ready
 * @summary Readiness healthcheck endpoint
 * @tags health
 * @return {object} 200 - success response - application/json
 */
healthRouter.get('/ready', readiness); // GET /health/ready
