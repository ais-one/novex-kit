import type { Knex } from 'knex';

/**
 * Sets the transaction-scoped delete reason read by the `enforce_hard_delete_log()` Postgres
 * trigger (docs/design/pg-audit-implementation.md §3.3) before issuing the delete. That trigger
 * — not this function — snapshots the row into `hard_delete_log`, recording the reason when one
 * is supplied but never blocking the delete for lacking one; this helper's only job is
 * supplying it. `trx` must come from `req.dbTransaction()` (see audit-context.ts), never a bare
 * Knex instance, so the `SET LOCAL` is actually scoped to the delete.
 */
export async function hardDelete(
  trx: Knex.Transaction,
  tableName: string,
  recordId: number | string,
  reason?: string,
): Promise<void> {
  await trx.raw(`SELECT set_config('app.delete_reason', ?, true)`, [reason ?? '']);

  const deletedCount = await trx(tableName).where({ id: recordId }).delete();
  if (!deletedCount) throw new Error(`Record ${recordId} not found in ${tableName}`);
}
