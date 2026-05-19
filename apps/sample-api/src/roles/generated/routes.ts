// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: roles
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import rolesController from '../controller.ts';
import { RolesBodySchema, RolesParamsSchema, RolesQuerySchema, RolesUpdateSchema } from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', RolesBodySchema), rolesController.create)
  .get('/', authUser, validate('query', RolesQuerySchema), rolesController.find)
  .get('/:id', authUser, validate('params', RolesParamsSchema), rolesController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', RolesParamsSchema),
    validate('body', RolesUpdateSchema),
    rolesController.update,
  )
  .delete('/:id', authUser, validate('params', RolesParamsSchema), rolesController.remove);
