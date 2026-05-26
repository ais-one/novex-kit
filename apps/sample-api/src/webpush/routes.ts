import { findUser, updateUser } from '@common/node/auth/store';
import * as webpush from '@common/node/comms/webpush';
import { validate } from '@common/node/errors/validate';
import express from 'express';
import { WebPushParamsSchema, WebPushSendSchema, WebPushSubSchema } from './schema.js';

logger.info('WARNING Auth bypass in webpush.js');

const authUser = (req, res, next) => {
  req.user = { sub: 1 };
  next();
};

export default express
  .Router()
  .get('/vapid-public-key', (req, res) => res.json({ publicKey: webpush.getPubKey() }))
  .post('/sub', authUser, validate('body', WebPushSubSchema), async (req, res) => {
    const { subscription } = req.body; // should be a string
    await updateUser({ id: req.user.sub }, { pnToken: subscription });
    res.json({ status: 'sub' });
  })
  .post('/unsub', authUser, async (req, res) => {
    await updateUser({ id: req.user.sub }, { pnToken: '' });
    res.json({ status: 'unsub' });
  })
  .post(
    '/send/:id',
    /* authUser, */ validate('params', WebPushParamsSchema),
    validate('body', WebPushSendSchema),
    async (req, res) => {
      // sending...
      const { id } = req.params;
      const { mode, data = {} } = req.body;
      const user = await findUser({ id });
      let rv = null;

      if (user?.pnToken) {
        const options = {
          TTL: 60,
          // headers: {
          //   'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
          //   'Content-type': 'application/json'
          // },
        };
        const subscription = JSON.parse(user.pnToken);
        // logger.info(id, mode, subscription, data, options)
        rv = await webpush.send(subscription, `FROM Backend: ${JSON.stringify(data)}`, options);
        res.json({ status: 'sent', mode, rv });
      } else {
        res.status(404).json({ status: 'no user or token' });
      }
    },
  );
