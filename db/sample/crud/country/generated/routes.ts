// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: country
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import countryController from '../controller.ts';
import { CountryBodySchema, CountryParamsSchema, CountryQuerySchema, CountryUpdateSchema } from './schema.ts';

export default express
  .Router()
  .post('/', authUser, validate('body', CountryBodySchema), countryController.create)
  .get('/', authUser, validate('query', CountryQuerySchema), countryController.find)
  .get('/:id', authUser, validate('params', CountryParamsSchema), countryController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', CountryParamsSchema),
    validate('body', CountryUpdateSchema),
    countryController.update,
  )
  .delete('/:id', authUser, validate('params', CountryParamsSchema), countryController.remove);
