import { type Parser as CsvParser, parse as csvParse } from 'csv-parse';
import type { Response } from 'express';
import * as svc from '../../services/index.ts';
import type { T4TRequest } from '../types.ts';

// custom function demo
// when country table is uploaded, state data is also created (csv needs to have sufficient data for state row)
const upload = async (req: T4TRequest, res: Response): Promise<void> => {
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
  let columnsError = false;
  csvParse(csv)
    .on('error', e => logger.error(e.message))
    .on('readable', function (this: CsvParser) {
      let record = this.read() as string[] | null;
      while (record) {
        line++;
        if (line === 1) {
          // check headers match...
          const headers = 'code,name,states';
          if (headers !== record.join(',')) {
            errors.push(`-1,Fatal Error: missing column/s`);
            columnsError = true;
            break;
          }
          keys = [...record];
        } else {
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
          obj[keys[0]] = row[0];
          obj[keys[1]] = row[1];
          const states = row[2].split('|');
          writes.push(svc.get(table.conn)(table.name).insert(obj));
          for (let i = 0; i < states?.length; i++) {
            const data = {
              country_name: row[1],
              code: states[i],
              name: states[i],
            };
            writes.push(svc.get(table.conn)('state').insert(data));
          }
        } catch (e) {
          errors.push(`${_line},Caught exception: ${String(e)}`);
        }
      }
      try {
        const rv = await Promise.allSettled(writes); // [ { status !== 'fulfilled', reason } ]
        rv.forEach((result, index) => {
          if (result.status !== 'fulfilled') errors.push(`${index + 1},${result.reason}`);
        });
      } catch (e) {
        errors.push(`-2,General write error: ${String(e)}`);
      }
      return void res.status(200).json({ errorCount: errors.length, errors });
    });
};

export default {
  country: {
    upload,
  },
};
