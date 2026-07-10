import express from 'express';
import processOutboxRoute from './process-outbox/routes.ts';
import testRoute from './test/routes.ts';

const router = express.Router();

export default ({ app }) => {
  app.use('/cron', router.use('/', processOutboxRoute), router.use('/', testRoute));
};
