import express from 'express';
import base from './api/base/routes.ts';
import graph from './api/graph/routes.ts';
import rag from './api/rag/routes.ts';
import telegram from './api/telegram/routes.ts';
import tools from './api/tools/routes.ts';

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
