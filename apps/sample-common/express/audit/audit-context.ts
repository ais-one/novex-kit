import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Knex } from 'knex';

// Application-layer half of docs/design/pg-audit-implementation.md §6.2. The database half
// (audit_log/hard_delete_log tables, audit_trigger_func(), enforce_hard_delete_log(), the
// triggers themselves) is a per-database migration concern documented in that file's §2-§4 —
// out of scope here. This module only has to guarantee that whenever a Postgres trigger reads
// `current_setting('app.current_user_id', true)` etc., those values are actually there.

/** A transaction-scoped unit of work handed to `req.dbTransaction()`. */
export type DbTransactionCallback<T> = (trx: Knex.Transaction) => Promise<T>;

/** Attached to `req` by `auditContext()` — see that function's doc comment. */
export type DbTransaction = <T>(callback: DbTransactionCallback<T>) => Promise<T>;

/**
 * Builds the `auditContext` Express middleware for a given Knex instance. Attaches
 * `req.dbTransaction`, a drop-in replacement for reaching into the DB directly: it opens a
 * Knex transaction and immediately `set_config`s four `SET LOCAL` session variables that the
 * `audit_trigger_func()` / `enforce_hard_delete_log()` Postgres triggers read —
 * `app.current_user_id`, `app.current_tenant_id`, `app.session_id`, `app.transaction_id`.
 * Scoped to the transaction, so they clear automatically on commit or rollback and never leak
 * between requests. One UUID is minted per `dbTransaction()` call, linking every `audit_log`
 * row it produces so a multi-statement change can be reconstructed atomically — see the design
 * doc §6.4.
 *
 * Reads identity off `req.user` (populated by this repo's auth middleware — see
 * `common/node/auth`) and `req.requestId` (populated by
 * `@common/node/express/requestId`'s `requestIdMiddleware`) rather than re-deriving them from
 * headers, since both are already this repo's canonical source — see the structured-logging
 * skill. Must be wired in after both of those middlewares.
 */
export function auditContext(db: Knex) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.dbTransaction = <T>(callback: DbTransactionCallback<T>): Promise<T> =>
      db.transaction(async trx => {
        const userId = req.user?.sub ?? '';
        const tenantId = req.user?.tenant_id ?? '';
        const sessionId = req.requestId ?? '';
        const transactionId = randomUUID();

        await trx.raw(
          `SELECT
             set_config('app.current_user_id',   ?, true),
             set_config('app.current_tenant_id', ?, true),
             set_config('app.session_id',        ?, true),
             set_config('app.transaction_id',    ?, true)`,
          [String(userId), String(tenantId), String(sessionId), transactionId],
        );

        return callback(trx);
      });

    next();
  };
}
