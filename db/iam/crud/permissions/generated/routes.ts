// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: permissions
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import permissionsController from '../controller.ts';
import {
  PermissionsBodySchema,
  PermissionsParamsSchema,
  PermissionsQuerySchema,
  PermissionsUpdateSchema,
} from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', PermissionsBodySchema), permissionsController.create)
  .get('/', authUser, validate('query', PermissionsQuerySchema), permissionsController.find)
  .get('/:id', authUser, validate('params', PermissionsParamsSchema), permissionsController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', PermissionsParamsSchema),
    validate('body', PermissionsUpdateSchema),
    permissionsController.update,
  )
  .delete('/:id', authUser, validate('params', PermissionsParamsSchema), permissionsController.remove);
