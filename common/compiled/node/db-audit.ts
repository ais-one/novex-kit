import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hardDeleteLog } from './services/db/schema.ts';

type AnyDb = NodePgDatabase<Record<string, unknown>>;

/**
 * Express middleware factory that attaches `req.dbTransaction(callback)` to every request.
 *
 * The callback receives a Drizzle transaction pre-loaded with four PostgreSQL session variables
 * so that audit triggers can read the calling user's context:
 * - `app.current_user_id`   — JWT `sub` claim
 * - `app.current_tenant_id` — JWT `tenant_id` claim
 * - `app.session_id`        — `x-request-id` request header
 * - `app.transaction_id`    — freshly generated UUIDv4 per transaction
 *
 * @param {AnyDb} db - connected Drizzle `NodePgDatabase` instance
 * @returns {Function} Express `RequestHandler` that sets `req.dbTransaction` and calls `next()`
 */
export const auditMiddleware = (db: AnyDb) => {
  return async (
    req: Request & { dbTransaction?: (cb: (trx: AnyDb) => Promise<unknown>) => Promise<unknown> },
    _res: Response,
    next: NextFunction,
  ) => {
    const userId = req.user?.sub ?? null;
    const tenantId = req.user?.tenant_id ?? null;
    const sessionId = req.headers['x-request-id'] ?? null;

    req.dbTransaction = (callback: (trx: AnyDb) => Promise<unknown>) =>
      db.transaction(async trx => {
        const txId = uuidv4();

        await trx.execute(sql`
          SELECT
            set_config('app.current_user_id',   ${userId ?? ''}, true),
            set_config('app.current_tenant_id', ${tenantId ?? ''}, true),
            set_config('app.session_id',        ${sessionId ?? ''}, true),
            set_config('app.transaction_id',    ${txId}, true)
        `);

        return callback(trx as unknown as AnyDb);
      });

    next();
  };
};

type RecordId = number | string | Record<string, number | string>;

/**
 * Render one composite-key object as a SQL tuple literal, e.g. `('1', '7')`.
 * @param {Record<string, number | string>} id - composite key object `{ order_id: 1, product_id: 7 }`
 * @param {string[]} keys - ordered list of key names to extract from `id`
 * @returns {string} SQL tuple string `('val1', 'val2', ...)`
 */
function buildTupleRow(id: Record<string, number | string>, keys: string[]): string {
  const values = keys.map(k => `'${id[k]}'`).join(', ');
  return `(${values})`;
}

/**
 * Render an array of composite-key objects as a SQL tuple list for use in `WHERE (cols) IN (...)`.
 * @param {Record<string, number | string>[]} ids - array of composite key objects
 * @param {string[]} keys - ordered list of key names to extract from each object
 * @returns {string} comma-separated tuple string, e.g. `('1', '7'), ('2', '8')`
 */
function buildTuples(ids: Record<string, number | string>[], keys: string[]): string {
  return ids.map(id => buildTupleRow(id, keys)).join(', ');
}

/**
 * Render an array of column names as a double-quoted SQL column list, e.g. `"order_id", "product_id"`.
 * @param {string[]} keys - column names to quote
 * @returns {string} SQL column list string
 */
function buildColList(keys: string[]): string {
  return keys.map(k => `"${k}"`).join(', ');
}

/**
 * Hard-delete records from a table and write one audit log entry per deleted row.
 * Must be called inside `req.dbTransaction` so session variables are set for the trigger.
 *
 * @param {AnyDb} trx - active Drizzle transaction obtained from `req.dbTransaction`
 * @param {string} tableName - unquoted name of the target PostgreSQL table (e.g. `'orders'`)
 * @param {RecordId | RecordId[]} recordId - one of:
 *   - a single scalar id: `42` or `'uuid-...'`
 *   - an array of scalar ids: `[1, 2, 3]`
 *   - an array of composite-key objects: `[{ order_id: 1, product_id: 7 }]`
 * @param {string} reason - human-readable deletion reason stored in `hard_delete_log.reason`
 * @returns {Promise<void>}
 * @throws if any of the specified records are not found in the table before deletion
 */
export const hardDelete = async (
  trx: AnyDb,
  tableName: string,
  recordId: RecordId | RecordId[],
  reason: string,
): Promise<void> => {
  const { rows } = await trx.execute(sql`SELECT current_setting('app.current_user_id', true) AS uid`);
  const deletedBy: string = (rows[0] as Record<string, string>).uid;

  const ids = Array.isArray(recordId) ? recordId : [recordId];
  const isComposite = ids[0] !== null && typeof ids[0] === 'object';

  // Fetch records to be deleted using raw SQL for dynamic table name
  let records: Record<string, unknown>[];
  if (isComposite) {
    const keys = Object.keys(ids[0] as Record<string, unknown>);
    const tuples = buildTuples(ids as Record<string, number | string>[], keys);
    const colList = buildColList(keys);
    const result = await trx.execute(sql.raw(`SELECT * FROM "${tableName}" WHERE (${colList}) IN (${tuples})`));
    records = result.rows;
  } else {
    const idList = (ids as (number | string)[]).join(', ');
    const result = await trx.execute(sql.raw(`SELECT * FROM "${tableName}" WHERE id IN (${idList})`));
    records = result.rows;
  }

  // Validate all records exist
  if (isComposite) {
    const keys = Object.keys(ids[0] as Record<string, unknown>);
    const toKey = (obj: Record<string, unknown>) => JSON.stringify(keys.map(k => obj[k]));
    const foundKeys = new Set(records.map(toKey));
    const missing = (ids as Record<string, unknown>[]).filter(id => !foundKeys.has(toKey(id)));
    if (missing.length > 0)
      throw new Error(`Records not found in ${tableName}: ${missing.map(id => JSON.stringify(id)).join(', ')}`);
  } else {
    const foundIds = new Set(records.map(r => r.id));
    const missing = (ids as (number | string)[]).filter(id => !foundIds.has(id));
    if (missing.length > 0) throw new Error(`Records not found in ${tableName}: ${missing.join(', ')}`);
  }

  const toRecordIdStr = isComposite
    ? (record: Record<string, unknown>) => {
        const keys = Object.keys(ids[0] as Record<string, unknown>);
        return JSON.stringify(Object.fromEntries(keys.map(k => [k, record[k]])));
      }
    : (record: Record<string, unknown>) => {
        const id = record.id;
        return typeof id === 'string' || typeof id === 'number' ? String(id) : JSON.stringify(id);
      };

  // Write audit log entries
  await trx.insert(hardDeleteLog).values(
    records.map(record => ({
      table_name: tableName,
      record_id: toRecordIdStr(record),
      deleted_by: deletedBy,
      reason,
      deleted_data: record,
    })),
  );

  // Perform the actual delete
  if (isComposite) {
    const keys = Object.keys(ids[0] as Record<string, unknown>);
    const tuples = buildTuples(ids as Record<string, number | string>[], keys);
    const colList = buildColList(keys);
    await trx.execute(sql.raw(`DELETE FROM "${tableName}" WHERE (${colList}) IN (${tuples})`));
  } else {
    const idList = (ids as (number | string)[]).join(', ');
    await trx.execute(sql.raw(`DELETE FROM "${tableName}" WHERE id IN (${idList})`));
  }
};
