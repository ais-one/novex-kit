// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: tenantRoles
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import tenantRolesController from '../controller.ts';
import {
  TenantRolesBodySchema,
  TenantRolesParamsSchema,
  TenantRolesQuerySchema,
  TenantRolesUpdateSchema,
} from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', TenantRolesBodySchema), tenantRolesController.create)
  .get('/', authUser, validate('query', TenantRolesQuerySchema), tenantRolesController.find)
  .get('/:id', authUser, validate('params', TenantRolesParamsSchema), tenantRolesController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', TenantRolesParamsSchema),
    validate('body', TenantRolesUpdateSchema),
    tenantRolesController.update,
  )
  .delete('/:id', authUser, validate('params', TenantRolesParamsSchema), tenantRolesController.remove);
