import express from 'express';
import * as auth from './auth/routes.ts';
import iamUsersRoute from './iam-users/routes.ts';

const router = express.Router();

export default ({ app }) => {
  app.use(
    '/api/iam',
    router.use('/iam-users', iamUsersRoute),
    // Add more CRUD mounts here after running generate:crud
    // Example: router.use('/roles', rolesRoute),
  );

  app.use(
    '/api',
    router.use('/auth', auth.myauthRoute),
    router.use('/oidc', auth.oidcRoute),
    router.use('/oauth', auth.oauthRoute),
    router.use('/saml', auth.samlRoute),
  );
};
