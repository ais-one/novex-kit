// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: subject
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import subjectController from '../controller.ts';
import { SubjectBodySchema, SubjectParamsSchema, SubjectQuerySchema, SubjectUpdateSchema } from './schema.ts';

export default express
  .Router()
  .post('/', authUser, validate('body', SubjectBodySchema), subjectController.create)
  .get('/', authUser, validate('query', SubjectQuerySchema), subjectController.find)
  .get('/:code', authUser, validate('params', SubjectParamsSchema), subjectController.findOne)
  .patch(
    '/:code',
    authUser,
    validate('params', SubjectParamsSchema),
    validate('body', SubjectUpdateSchema),
    subjectController.update,
  )
  .delete('/:code', authUser, validate('params', SubjectParamsSchema), subjectController.remove);
