import express from 'express';
import { cronAuth } from '../auth/bearer.ts';
import * as controller from './controller.ts';

export default express.Router().post('/process-outbox', cronAuth(), controller.process);
