import { cronAuth } from '@common/node/cron/auth/bearer';
import express from 'express';
import * as controller from './controller.ts';

export default express.Router().post('/process-outbox', cronAuth(), controller.process);
