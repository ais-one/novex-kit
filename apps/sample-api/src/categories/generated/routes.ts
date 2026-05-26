// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: categories
// ─────────────────────────────────────────────────────────────────────────────
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import categoriesController from '../controller.ts';
import {
  CategoriesBodySchema,
  CategoriesParamsSchema,
  CategoriesQuerySchema,
  CategoriesUpdateSchema,
} from './schema.js';

export default express
  .Router()
  .post('/', authUser, validate('body', CategoriesBodySchema), categoriesController.create)
  .get('/', authUser, validate('query', CategoriesQuerySchema), categoriesController.find)
  .get('/:id', authUser, validate('params', CategoriesParamsSchema), categoriesController.findOne)
  .patch(
    '/:id',
    authUser,
    validate('params', CategoriesParamsSchema),
    validate('body', CategoriesUpdateSchema),
    categoriesController.update,
  )
  .delete('/:id', authUser, validate('params', CategoriesParamsSchema), categoriesController.remove);
