import t4tRoutes from '@common/node/t4t/index';
import categoriesRoute from '@db/sample/crud/categories/routes';
import express from 'express';
import base from './base/routes.ts';
import fido from './fido/routes.ts';
import email from './sendgrid/routes.ts';
import emailTemplates from './sendgrid/template-routes.ts';
import emailWebhooks from './sendgrid/webhook-routes.ts';
import sse from './sse/routes.ts';
import telegram from './telegram/routes.ts';
import tenantComms from './tenant-comms/routes.ts';
import tests from './tests/routes.ts';
import webhooks from './webhooks/routes.ts';
import webpush from './webpush/routes.ts';
import whatsapp from './whatsapp/routes.ts';
import whatsappTemplates from './whatsapp/template-routes.ts';

// Generated CRUD routes now live in @db/sample/crud/<table> (and @db/audit/crud/<table>) —
// run `npm run crud:generate` there to regenerate, then mount here.
// Example: import awardRoute from '@db/sample/crud/award/routes';
//          router.use('/award', awardRoute);

const router = express.Router();

// export your routes here - make sure no clashes
export default ({ app }) => {
  app.use(
    '/api/sample-api',
    router.use('/', base), // http://127.0.0.1:3000/api/sample-api/
    router.use('/categories', categoriesRoute), // http://127.0.0.1:3000/api/sample-api/categories/
    router.use('/webhooks', webhooks),
    router.use('/whatsapp', whatsapp), // http://127.0.0.1:3000/api/sample-api/whatsapp/webhook
    router.use('/whatsapp/templates', whatsappTemplates), // http://127.0.0.1:3000/api/sample-api/whatsapp/templates
    router.use('/sendgrid', email), // http://127.0.0.1:3000/api/sample-api/sendgrid/test
    router.use('/sendgrid/templates', emailTemplates), // http://127.0.0.1:3000/api/sample-api/sendgrid/templates
    router.use('/sendgrid', emailWebhooks), // http://127.0.0.1:3000/api/sample-api/sendgrid/inbound + /events
    router.use('/telegram', telegram), // http://127.0.0.1:3000/api/sample-api/telegram/test + /send + /webhook
    router.use('/tenant-comms', tenantComms), // http://127.0.0.1:3000/api/sample-api/tenant-comms
    router.use('/sse', sse),
    router.use('/tests', tests), // for tests
    router.use('/webpush', webpush),
    router.use('/fido', fido),
  );

  t4tRoutes({ app, routePrefix: '/api/t4t' }); // http://127.0.0.1:3000/api/t4t/
};
