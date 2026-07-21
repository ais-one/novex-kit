import express from 'express';
import base from './base/routes.ts';
import graph from './graph/routes.ts';
import rag from './rag/routes.ts';
import telegram from './telegram/routes.ts';
import tools from './tools/routes.ts';

const router = express.Router();

export default ({ app }: { app: express.Express }) => {
  app.use(
    '/api/sample-botbuilder',
    router.use('/', base),
    router.use('/graph', graph),
    router.use('/rag', rag),
    router.use('/tools', tools),
    router.use('/telegram', telegram),
  );
};
