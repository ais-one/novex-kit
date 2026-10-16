import { Parser } from '@json2csv/plainjs';
import { type Parser as CsvParser, parse } from 'csv-parse';
import type { Response } from 'express';
import * as svc from '../services/index.ts';
import { formUniqueKey, isInvalidInput, kvDb2Col, mapRelation } from './t4t-utils.ts';
import type { T4TRequest } from './types.ts';

//import csvParse from "csv-parse";
const csvParse = parse;

const upload = async (req: T4TRequest, res: Response): Promise<void> => {
  logger.info('base upload');
  const { table } = req;
  if (!table.import) throw new Error('Forbidden - Upload');
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const csv = req.file.buffer.toString('utf-8');
  const output: string[][] = [];
  const errors: string[] = [];
  let keys: string[] = [];
  let line = 0;
  let columnsError = false; // flag as true
  const keyMap: Record<string, boolean> = {};
  csvParse(csv)
    .on('error', e => logger.error(e.message))
    .on('readable', function (this: CsvParser) {
      let record = this.read() as string[] | null;
      while (record) {
        line++;
        if (line === 1) {
          keys = [...record];
          keys.forEach(key => {
            keyMap[key] = true;
          });
          for (const k in table.cols) {
            if (
              (table.cols[k].required && !keyMap[k]) || // required column not present
              (keyMap[k] && table.cols[k].type === 'link') || // columns is a link
              (keyMap[k] && table.cols[k].auto) // columns is auto
            ) {
              errors.push(`-1,Fatal Error: missing required column/s or invalid column/s`);
              columnsError = true;
              break;
            }
          }
          record = this.read() as string[] | null;
          continue; // ignore first line
        }
        if (!columnsError) {
          if (record.length === keys.length) {
            // ok
            if (record.join('')) {
              // TODO format before push?
              output.push(record);
            } else {
              errors.push(`${line},Empty Row`);
            }
          } else {
            errors.push(`${line},Column Count Mismatch`);
          }
        }
        record = this.read() as string[] | null;
      }
    })
    .on('end', async () => {
      let _line = 0;
      const writes: Promise<unknown>[] = [];
      for (const row of output) {
        _line++;
        try {
          const obj: Record<string, string> = {};
          for (let i = 0; i < keys.length; i++) {
            const colName = keys[i];
            // const col = table.cols[colName]
            // isInvalidInput(col, row[i], key) // TODO: should add validation here?
            // TODO: also take care of auto populating fields?
            // TODO: handle datetime local data...
            obj[colName] = row[i];
          }
          writes.push(svc.get(table.conn)(table.name).insert(obj));
        } catch (e) {
          errors.push(`L2-${_line},Caught exception: ${String(e)}`);
        }
      }
      try {
        if (writes.length) {
          const rv = await Promise.allSettled(writes); // [ { status !== 'fulfilled', reason } ]
          rv.forEach((result, index) => {
            if (result.status !== 'fulfilled') errors.push(`L3-${index + 1},${result.reason}`);
          });
        }
      } catch (e) {
        errors.push(`-2,General write error: ${String(e)}`);
      }
      return void res.status(200).json({ errorCount: errors.length, errors });
    });
};

const find = async (req: T4TRequest, res: Response): Promise<void> => {
  if (!req.table.view) throw new Error('Forbidden - List All');
  const { table } = req;
  const rawQuery = req.query as { page?: string; limit?: string; filters?: string; sorter?: string; csv?: string };
  let page = parseInt(rawQuery.page ?? '1'); // 1-based
  const limit = parseInt(rawQuery.limit ?? '25');
  // logger.info('t4t filters and sort', filters, sorter, table.name, page, limit)
  const filters: { col: string; op: string; val: unknown; andOr?: string }[] | null = JSON.parse(
    rawQuery.filters ?? 'null',
  ); // ignore where col === null, sort it 'or' first then 'and' // [ { col, op, val,andOr } ]
  let sorter: unknown[] = JSON.parse(rawQuery.sorter ?? '[]'); // [ { column, order: 'asc' } ] / [] order = asc, desc
  const csv = rawQuery.csv ?? '';
  if (req.table?.defaultSort && sorter.length === 0 && req.table.defaultSort.length > 0) {
    sorter = req.table.defaultSort;
  }
  if (page < 1) page = 1;
  const rv: { results: Record<string, unknown>[]; total: number } = { results: [], total: 0 };
  // biome-ignore lint/suspicious/noImplicitAnyLet: assigned from knex query below
  let rows;
  let query = svc.get(table.conn)(table.name);

  let columns = [`${table.name}.*`];
  if (table.select) columns = table.select.split(','); // custom columns... TODO need to add table name?

  query = query.where({});

  // TODO handle filters for joins...
  let prevFilter: Record<string, unknown> = {};
  const joinCols: Record<string, string> = {};
  if (filters?.length)
    for (const filter of filters) {
      const key = filter.col;
      const op = filter.op;
      const value = op === 'like' ? `%${filter.val}%` : filter.val;
      const _key = key;
      if (prevFilter.andOr || prevFilter.andOr === 'and') query = query.andWhere(_key, op, value);
      else query = query.orWhere(_key, op, value);
      prevFilter = filter;
    }
  if (limit === 0 || csv) {
    rows = await query.clone().orderBy(sorter);
    rv.total = rows.length;
  } else {
    const total = await query.clone().count();
    rv.total = Object.values(total[0])[0] as number;
    const maxPage = Math.ceil(rv.total / limit);
    if (page > maxPage) page = maxPage;

    for (const key in table.cols) {
      // if (table.cols[key]?.link?.display === 'fields') { // .type === 'link'
      //   table.cols[key]?.link?.cfields.split(',').map()
      // }
      const rel = mapRelation(key, table.cols[key]);
      if (rel) {
        // if has relation and is key-value
        const { table2, table2Id, table2Text, table1Id } = rel;
        query = query.leftOuterJoin(table2, `${table.name}.${table1Id}`, '=', `${table2}.${table2Id}`); // handles joins...
        const joinCol = `${table1Id}_${table2Text}`;
        joinCols[table1Id] = joinCol;
        columns = [...columns, `${table2}.${table2Text} as ${joinCols[table1Id]}`]; // add a join column
      }
    }
    rows = await query
      .clone()
      .column(...columns)
      .orderBy(sorter)
      .limit(limit)
      .offset((page > 0 ? page - 1 : 0) * limit);
    rows = rows.map(row => kvDb2Col(row, joinCols, table.cols));
  }
  if (csv) {
    const parser = new Parser({});
    const csvRows = parser.parse(rows);
    return void res.json({ csv: csvRows });
  } else {
    rv.results = rows.map(row => {
      // make column for UI to identify each row
      if (table.pk) {
        row.__key = row[table.pk];
      } else {
        const val: unknown[] = [];
        for (const k of table.multiKey) val.push(row[k]);
        row.__key = val.join('|');
      }
      return row;
    });
    return void res.json(rv);
  }
};

const findOne = async (req: T4TRequest, res: Response): Promise<void> => {
  if (!req.table.view) throw new Error('Forbidden - List One');
  const { table } = req;
  const where = formUniqueKey(table, req.query.__key as string);
  if (!where) return void res.status(400).json({}); // bad request
  let columns = [`${table.name}.*`];
  if (table.select) columns = table.select.split(','); // custom columns... TODO need to add table name?
  let query = svc.get(table.conn)(table.name).where(where);
  const joinCols: Record<string, string> = {};
  for (const key in table.cols) {
    const rel = mapRelation(key, table.cols[key]);
    if (rel) {
      // if has relation and is key-value
      const { table2, table2Id, table2Text, table1Id } = rel;
      query = query.leftOuterJoin(table2, `${table.name}.${table1Id}`, '=', `${table2}.${table2Id}`); // handles joins...
      const joinCol = `${table1Id}_${table2Text}`;
      joinCols[table1Id] = joinCol;
      columns = [...columns, `${table2}.${table2Text} as ${joinCol}`]; // add a join colomn
    }
  }
  let rv = await query.column(...columns).first();
  rv = rv ? kvDb2Col(rv, joinCols, table.cols) : null; // return null if not found
  return void res.status(rv ? 200 : 404).json(rv);
};

const remove = async (req: T4TRequest, res: Response): Promise<void> => {
  if (!req.table.delete) throw new Error('Forbidden - Delete');
  const { table } = req;
  const { ids }: { ids: string[] } = req.body;
  if (table.deleteLimit > 0 && ids.length > table.deleteLimit)
    return void res.status(400).json({ error: `Select up to ${table.deleteLimit} items` });
  if (ids.length < 1) return void res.status(400).json({ error: 'No item selected' });

  // TODO delete relations junction, do not delete if value is in use... // use Foreign Key...
  const trx = await svc.get(table.conn).transaction();
  try {
    if (table.pk || table.multiKey.length === 1) {
      // delete using pk
      const keyCol = table.pk || table.multiKey[0];
      await svc.get(table.conn)(table.name).whereIn(keyCol, ids).delete().transacting(trx);
    } else {
      const keys = ids.map(id => {
        const id_a = id.split('|');
        const multiKey: Record<string, string> = {};
        for (let i = 0; i < id_a.length; i++) {
          const keyName = table.multiKey[i];
          multiKey[keyName] = id_a[i];
        }
        logger.info('multiKey', multiKey); // AARON
        return svc.get(table.conn)(table.name).where(multiKey).delete().transacting(trx);
      });
      await Promise.allSettled(keys);
    }
    await trx.commit();
    return void res.json({
      deletedRows: ids.length,
    });
  } catch (e) {
    logger.error(e); // TODO
    await trx.rollback();
    throw e;
  }
};

const update = async (req: T4TRequest, res: Response): Promise<void> => {
  if (!req.table.update) throw new Error('Forbidden - Update');
  const { body, table } = req;
  const where = formUniqueKey(table, req.query.__key as string);
  let count = 0;

  if (!where) return void res.status(400).json({}); // bad request
  for (const key in table.cols) {
    // formally used table.cols, add in auto fields?
    if (body[key] !== undefined) {
      const col = table.cols[key];
      if (!col.editor) delete body[key];
      else if (col.edit !== true) delete body[key];
      else if (col?.hide === 'blank' && !body[key]) delete body[key];
      else {
        const invalid = isInvalidInput(col, body[key], key);
        if (invalid) return void res.status(400).json(invalid);
        if (col.auto && col.auto === 'user') {
          body[key] = req?.user?.sub || 'unknown';
        } else if (col.auto && col.auto === 'ts') {
          body[key] = new Date().toISOString();
        } else {
          // TRANSFORM INPUT
          body[key] = ['integer', 'decimal'].includes(col.type ?? '')
            ? Number(body[key])
            : ['datetime', 'date', 'time'].includes(col.type ?? '')
              ? body[key]
                ? new Date(body[key])
                : null
              : body[key];
        }
      }
    }
  }
  if (Object.keys(body).length) {
    // update if there is something to update
    // TODO delete all related records in other tables?
    // TODO delete images for failed update?
    const trx = await svc.get(table.conn).transaction();
    try {
      count = await svc.get(table.conn)(table.name).update(body).where(where).transacting(trx);
      await trx.commit();
    } catch (e) {
      await trx.rollback();
      throw e;
    }
  }
  if (!count) {
    // nothing was updated..., if (table.upsert) do insert ?
  }
  return void res.json({ count });
};

const create = async (req: T4TRequest, res: Response): Promise<void> => {
  if (!req.table.create) throw new Error('Forbidden - Create');
  const { table, body } = req;
  for (const key in table.cols) {
    const col = table.cols[key];
    if (!col.creator) delete body[key];
    else if (col.add !== true) delete body[key];
    else if (col.auto && col.auto === 'pk' && key in body) delete body[key];
    else {
      const invalid = isInvalidInput(col, body[key], key);
      if (invalid) return void res.status(400).json(invalid);
      if (col.auto && col.auto === 'user') {
        body[key] = req?.user?.sub || 'unknown';
      } else if (col.auto && col.auto === 'ts') {
        body[key] = new Date().toISOString();
      } else {
        // TRANSFORM INPUT
        body[key] = ['integer', 'decimal'].includes(table.cols[key].type ?? '')
          ? Number(body[key])
          : ['datetime', 'date', 'time'].includes(table.cols[key].type ?? '')
            ? body[key]
              ? new Date(body[key])
              : null
            : body[key];
      }
    }
  }
  // biome-ignore lint/suspicious/noImplicitAnyLet: assigned from knex insert result below
  let rv;
  const trx = await svc.get(table.conn).transaction();
  try {
    let query = svc.get(table.conn)(table.name).insert(body);
    if (table.pk) query = query.returning(table.pk);
    rv = await query.clone().transacting(trx);
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }
  // let rv = null
  // let query = svc.get(table.conn)(table.name).insert(body)
  // if (table.pk) query = query.returning(table.pk)
  // rv = await query.clone()
  // const recordKey = rv?.[0] // id - also... disallow link tables input... for creation
  return void res.status(201).json(rv);
};

export default {
  upload,
  find,
  findOne,
  remove,
  update,
  create,
};
