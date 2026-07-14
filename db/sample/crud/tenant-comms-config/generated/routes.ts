// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: tenantCommsConfig
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import tenantCommsConfigController from '../controller.ts';
import {
  TenantCommsConfigBodySchema,
  TenantCommsConfigParamsSchema,
  TenantCommsConfigQuerySchema,
  TenantCommsConfigUpdateSchema,
} from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', TenantCommsConfigBodySchema), tenantCommsConfigController.create)
  .get('/', authUser, validate('query', TenantCommsConfigQuerySchema), tenantCommsConfigController.find)
  .get('/:id', authUser, validate('params', TenantCommsConfigParamsSchema), tenantCommsConfigController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', TenantCommsConfigParamsSchema),
    validate('body', TenantCommsConfigUpdateSchema),
    tenantCommsConfigController.update,
  )
  .delete('/:id', authUser, validate('params', TenantCommsConfigParamsSchema), tenantCommsConfigController.remove);
