import * as oauth from '@common/node/auth/controllers/oauth';
import * as oidc from '@common/node/auth/controllers/oidc';
import * as own from '@common/node/auth/controllers/own';
import * as saml from '@common/node/auth/controllers/saml';
import * as auth from '@common/node/auth/jwt';
import express from 'express';

export const myauthRoute = express
  .Router()
  .post('/login', own.login)
  .post('/otp', own.otp)
  .post('/refresh', auth.authRefresh)
  .get('/logout', own.logout)
  .get('/verify', auth.authUser, async (req, res) => res.json({}))
  .get('/me', auth.authUser, (req, res) => {
    const { sub } = req.user;
    // you can also get more user information from here from a datastore
    return res.status(200).json({ user: sub, ts: Date.now() });
  })
  .post('/signup', (req, res) => {
    // TODO
    res.status(201).end();
  });

export const oauthRoute = express.Router().get('/callback', oauth.callbackOAuth);

export const oidcRoute = express
  .Router()
  .get('/login', oidc.login)
  .get('/auth', oidc.auth)
  .get('/refresh', oidc.refresh);

export const samlRoute = express.Router().get('/login', saml.login).post('/callback', saml.auth);
