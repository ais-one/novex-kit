// ─────────────────────────────────────────────────────────────────────────────
// Sidecar — created once, then YOURS. Will NOT be overwritten by generate:crud.
// Extend or override the generated code below as needed.
// ─────────────────────────────────────────────────────────────────────────────
import express from 'express';
import generatedRoutes from './generated/routes.ts';

// Add custom endpoints or override route schemas BEFORE .use('/', generatedRoutes).
// Express matches in registration order — the first matching handler wins.
export default express
  .Router()
  // Example A — new endpoint (add named export to controller.ts first):
  // .get('/search', authUser, validate('query', PermissionsSearchSchema), search)
  //
  // Example B — override a route's input schema (export updated schema from schema.js first):
  // .post('/', authUser, validate('body', PermissionsBodySchema), permissionsController.create)
  //
  // NOTE: to override just the handler logic (not the schema), only controller.ts is needed.
  // The generated routes import from ../controller.ts so overrides are picked up automatically.
  .use('/', generatedRoutes);
