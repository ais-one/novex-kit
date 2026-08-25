# Audit context middleware (shared by `apps/*`)

Implements the Express/Knex application-layer half of `docs/design/pg-audit-implementation.md`
— the middleware that injects request identity into the database session so the
`audit_trigger_func()` / `enforce_hard_delete_log()` Postgres triggers described there can
attribute every row change to the request that caused it. This lives in `sample-common`, not
`common/`, for the same reason as `services/mq/`: it's shared `apps/*` infrastructure for
whichever apps chose a Postgres+Knex stack, not template-wide (a Drizzle-based app instead uses
`common/compiled/node/db-audit.ts` — see that file's doc comment).

**The database side is out of scope here.** Tables (`audit_log`, `hard_delete_log`,
`audit_registry`), trigger functions, the triggers themselves, and `pgaudit` config are a
per-database migration concern — see the design doc §2-§5. This module only guarantees the
four `SET LOCAL` values those triggers read are actually set before a query runs.

## `auditContext(db)` — `audit-context.ts`

Attaches `req.dbTransaction` to every request. Wire it in once per app, **after** the app's own
auth middleware (so `req.user` is populated) and after `requestIdMiddleware` (so
`req.requestId` is populated):

```ts
import { requestIdMiddleware } from '@common/node/express/requestId';
import { auditContext } from '@apps/sample-common/express/audit/audit-context';

app.use(requestIdMiddleware);
app.use(authMiddleware); // populates req.user — must run before auditContext
app.use(auditContext(db)); // attaches req.dbTransaction
```

Every route/controller then uses `req.dbTransaction()` instead of importing the Knex instance
directly:

```ts
app.patch('/orders/:id', async (req, res) => {
  const result = await req.dbTransaction(trx =>
    trx('orders').where({ id: req.params.id }).update({ status: req.body.status }).returning('*'),
  );
  res.json(result[0]);
});
```

Multiple statements inside one `req.dbTransaction()` call share the same `transaction_id`,
letting `audit_log` reconstruct exactly what changed atomically — see the design doc §6.4.

## `hardDelete()` — `hard-delete.ts`

Sets the transaction-scoped delete reason the `enforce_hard_delete_log()` trigger records, then
issues the delete. The row snapshot and the `hard_delete_log` write happen entirely inside that
trigger — this helper's only job is supplying the reason. The reason is optional: the trigger
records it when given but never blocks the delete for lacking one.

```ts
import { hardDelete } from '@apps/sample-common/express/audit/hard-delete';

app.delete('/users/:id', async (req, res) => {
  await req.dbTransaction(trx => hardDelete(trx, 'users', req.params.id, req.body.reason));
  res.sendStatus(204);
});
```

## Consuming app requirements

- Declare `dbTransaction` on `Express.Request` in the app's own `global.d.ts` — see
  `apps/sample-rest-app-v2/global.d.ts` for the pattern. This module intentionally doesn't
  declare it globally itself, matching how `user`/`fga`/`rbac`/`log`/`requestId` are already
  declared per-app rather than from one shared `.d.ts`.
- Use a Knex instance connected to PostgreSQL — the triggers this middleware supports
  (`set_config`/`current_setting`) are Postgres-specific.
- Rolled out first — and, as of this writing, only — in `apps/sample-rest-app-v2`. Copy its
  `src/repositories/data/db.ts` (Knex connection lifecycle) and its controllers/services'
  `req.dbTransaction()` usage for the next app.
