// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: iamUsers
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import iamUsersController from '../controller.ts';
import { IamUsersBodySchema, IamUsersParamsSchema, IamUsersQuerySchema, IamUsersUpdateSchema } from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', IamUsersBodySchema), iamUsersController.create)
  .get('/', authUser, validate('query', IamUsersQuerySchema), iamUsersController.find)
  .get('/:id', authUser, validate('params', IamUsersParamsSchema), iamUsersController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', IamUsersParamsSchema),
    validate('body', IamUsersUpdateSchema),
    iamUsersController.update,
  )
  .delete('/:id', authUser, validate('params', IamUsersParamsSchema), iamUsersController.remove);
