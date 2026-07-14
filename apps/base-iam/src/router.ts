import iamUsersRoute from '@db/iam/crud/iam-users/routes';
import express from 'express';
import * as auth from './auth/routes.ts';

const router = express.Router();

export default ({ app }) => {
  app.use(
    '/api/iam',
    router.use('/iam-users', iamUsersRoute),
    // Add more CRUD mounts here after running crud:generate in db/iam
    // Example: import rolesRoute from '@db/iam/crud/roles/routes';
    //          router.use('/roles', rolesRoute),
  );

  app.use(
    '/api',
    router.use('/auth', auth.myauthRoute),
    router.use('/oidc', auth.oidcRoute),
    router.use('/oauth', auth.oauthRoute),
    router.use('/saml', auth.samlRoute),
  );
};
