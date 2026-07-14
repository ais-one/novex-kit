// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: student
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import studentController from '../controller.ts';
import { StudentBodySchema, StudentParamsSchema, StudentQuerySchema, StudentUpdateSchema } from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', StudentBodySchema), studentController.create)
  .get('/', authUser, validate('query', StudentQuerySchema), studentController.find)
  .get('/:id', authUser, validate('params', StudentParamsSchema), studentController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', StudentParamsSchema),
    validate('body', StudentUpdateSchema),
    studentController.update,
  )
  .delete('/:id', authUser, validate('params', StudentParamsSchema), studentController.remove);
