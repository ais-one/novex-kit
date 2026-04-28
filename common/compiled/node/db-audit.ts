import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hardDeleteLog } from './services/db/schema.ts';

type AnyDb = NodePgDatabase<Record<string, unknown>>;

/**
 * Express middleware that attaches `req.dbTransaction(callback)` to the request.
 * The callback receives a Drizzle transaction pre-loaded with session variables
 * (`app.current_user_id`, `app.current_tenant_id`, `app.session_id`, `app.transaction_id`)
 * so that PostgreSQL audit triggers can read the calling user's context.
 *
 * @param db - A connected Drizzle instance.
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
 * Hard-delete records from a table, writing a deletion audit log entry for each row.
 *
 * @param trx - Active Drizzle transaction (use inside `req.dbTransaction`).
 * @param tableName - Target table name.
 * @param recordId - Single id, array of ids, or array of composite key objects.
 * @param reason - Human-readable reason for the deletion.
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
    const tuples = (ids as Record<string, number | string>[])
      .map(id => `(${keys.map(k => `'${id[k]}'`).join(', ')})`)
      .join(', ');
    const result = await trx.execute(
      sql.raw(`SELECT * FROM "${tableName}" WHERE (${keys.map(k => `"${k}"`).join(', ')}) IN (${tuples})`),
    );
    records = result.rows as Record<string, unknown>[];
  } else {
    const idList = (ids as (number | string)[]).join(', ');
    const result = await trx.execute(sql.raw(`SELECT * FROM "${tableName}" WHERE id IN (${idList})`));
    records = result.rows as Record<string, unknown>[];
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
    : (record: Record<string, unknown>) => String(record.id);

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
    const tuples = (ids as Record<string, number | string>[])
      .map(id => `(${keys.map(k => `'${id[k]}'`).join(', ')})`)
      .join(', ');
    await trx.execute(
      sql.raw(`DELETE FROM "${tableName}" WHERE (${keys.map(k => `"${k}"`).join(', ')}) IN (${tuples})`),
    );
  } else {
    const idList = (ids as (number | string)[]).join(', ');
    await trx.execute(sql.raw(`DELETE FROM "${tableName}" WHERE id IN (${idList})`));
  }
};
