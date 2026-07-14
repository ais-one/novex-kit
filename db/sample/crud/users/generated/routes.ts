// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: users
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import usersController from '../controller.ts';
import { UsersBodySchema, UsersParamsSchema, UsersQuerySchema, UsersUpdateSchema } from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', UsersBodySchema), usersController.create)
  .get('/', authUser, validate('query', UsersQuerySchema), usersController.find)
  .get('/:id', authUser, validate('params', UsersParamsSchema), usersController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', UsersParamsSchema),
    validate('body', UsersUpdateSchema),
    usersController.update,
  )
  .delete('/:id', authUser, validate('params', UsersParamsSchema), usersController.remove);
