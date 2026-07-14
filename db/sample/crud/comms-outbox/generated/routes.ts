// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: commsOutbox
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import commsOutboxController from '../controller.ts';
import {
  CommsOutboxBodySchema,
  CommsOutboxParamsSchema,
  CommsOutboxQuerySchema,
  CommsOutboxUpdateSchema,
} from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', CommsOutboxBodySchema), commsOutboxController.create)
  .get('/', authUser, validate('query', CommsOutboxQuerySchema), commsOutboxController.find)
  .get('/:id', authUser, validate('params', CommsOutboxParamsSchema), commsOutboxController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', CommsOutboxParamsSchema),
    validate('body', CommsOutboxUpdateSchema),
    commsOutboxController.update,
  )
  .delete('/:id', authUser, validate('params', CommsOutboxParamsSchema), commsOutboxController.remove);
