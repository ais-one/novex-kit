// const path = require('path')
import fs from 'node:fs';
import type { NextFunction, Response } from 'express';
import express from 'express';
import * as yaml from 'js-yaml';
import multer from 'multer';
import { memoryUpload } from '../express/upload.ts';
import * as svc from '../services/index.ts';

const { CONFIGS_FOLDER_PATH, CONFIGS_CSV_SIZE, CONFIGS_UPLOAD_SIZE, CUSTOM_PATH } = globalThis.__config?.T4T || {};

import base from './t4t-base.ts';
import { noAuthFunc, processJson, roleOperationMatch } from './t4t-utils.ts';
import type { FileUiConfig, T4TOptions, T4TRequest } from './types.ts';

const custom: Record<string, Record<string, (req: T4TRequest, res: Response) => Promise<void>>> = {};
// const custom = CUSTOM_PATH ? (await import(CUSTOM_PATH)).default : { };
// const custom = CUSTOM_PATH ? require(CUSTOM_PATH) : { }
const uploadMemory = {
  limits: { files: 1, fileSize: Number(CONFIGS_CSV_SIZE) || 500000 },
};

const storageUpload = () => {
  return multer({
    // TODO handle errors of missing properties
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const key = file.fieldname;
        const fileUiConfig = (req as T4TRequest).table.fileConfigUi[key] as FileUiConfig;
        const { folder } = fileUiConfig.multer;
        return cb(null, folder ?? '');
      },
      filename: (_req, file, cb) => cb(null, file.originalname), // file.fieldname, file.originalname
    }),
    fileFilter: (req, file, cb) => {
      // TODO check on individual file size
      const key = file.fieldname;
      const t4tReq = req as T4TRequest;
      const fileUiConfig = t4tReq.table.fileConfigUi[key] as FileUiConfig;
      const { options } = fileUiConfig.multer;
      if (!t4tReq.fileCount) t4tReq.fileCount = {};
      if (!t4tReq.fileCount[key]) t4tReq.fileCount[key] = 0;
      const maxFileLimit = options?.limits?.files || 1;
      if (t4tReq.fileCount[key] >= maxFileLimit) {
        return cb(new Error(`Maximum Number Of Files Exceeded`));
      }
      t4tReq.fileCount[key]++; // Increment the file count for each processed file
      // TODO validate binary file type... using npm file-type?
      // https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l
      // if (!['image/png', 'image/jpeg'].includes(file.mimetype)) {
      //   return cb(new Error('Invalid file type!'), false)
      // }
      return cb(null, true); // Accept the file
    },
    limits: {
      // files: 3,
      fileSize: Number(CONFIGS_UPLOAD_SIZE) || 8000000, // TODO
    },
  });
};

let roleKey = '';
let idKey = '';
let orgIdKey = '';

// __key is reserved property for identifying row in a table
// | is reserved for seperating columns that make the multiKey
const generateTable = async (req: T4TRequest, _res: Response, next: NextFunction): Promise<void> => {
  // TODO get config info from a table
  const tableKey = req.params.table; // 'books' // its the table name also

  // const docPath = path.resolve(new URL(".", import.meta.url).pathname, `./tables/${tableKey}.yaml`)
  const docPath = `${CONFIGS_FOLDER_PATH}${tableKey}.yaml`;
  const doc = yaml.load(fs.readFileSync(docPath, 'utf8'));
  req.table = JSON.parse(JSON.stringify(doc));

  // generated items
  req.table.pk = '';
  req.table.multiKey = [];
  req.table.required = [];
  req.table.auto = [];
  req.table.fileConfigUi = {};

  const { database, filename } = svc.get(req?.table?.conn)?.client?.config?.connection || {};
  req.table.db = database || filename || 'DB Not Found';

  // permissions settings
  req.table.view = roleOperationMatch((req.user?.[roleKey] ?? '') as string, req.table.view);
  const acStr = '/autocomplete';
  const acLen = acStr.length;
  if (req.path.substring(req.path.length - acLen) === acStr) {
    logger.info('auto complete here...');
    return next();
  }
  req.table.create = roleOperationMatch((req.user?.[roleKey] ?? '') as string, req.table.create);
  req.table.update = roleOperationMatch((req.user?.[roleKey] ?? '') as string, req.table.update);
  req.table.delete = roleOperationMatch((req.user?.[roleKey] ?? '') as string, req.table.delete);
  req.table.import = roleOperationMatch((req.user?.[roleKey] ?? '') as string, req.table.import);
  req.table.export = roleOperationMatch((req.user?.[roleKey] ?? '') as string, req.table.export);

  // sanitize
  req.table.deleteLimit = Number(req.table.deleteLimit) || -1;

  // can return for autocomplete... req.path
  const cols = req.table.cols;
  for (const key in cols) {
    const col = cols[key];
    if (col.auto) {
      if (col.auto === 'pk') {
        req.table.pk = key;
      } else {
        req.table.auto.push(key);
      }
    }
    if (col.multiKey) req.table.multiKey.push(key);
    if (col.required) req.table.required.push(key);
    if (col?.ui?.tag === 'files') req.table.fileConfigUi[key] = col?.ui;

    col.editor = !(col.editor && !roleOperationMatch((req.user?.[roleKey] ?? '') as string, col.editor, key));
    if (!col.editor && col.edit) col.edit = 'readonly';
    col.creator = !(col.creator && !roleOperationMatch((req.user?.[roleKey] ?? '') as string, col.creator, key));
    if (!col.creator && col.add) col.add = 'readonly';
  }
  // logger.info(req.table)
  return next();
};

const routes = (options?: T4TOptions): express.Router => {
  const authUser = options?.authFunc || noAuthFunc;
  roleKey = 'roles';
  idKey = 'sub';
  orgIdKey = 'tenant_id';

  return express
    .Router()
    .get('/healthcheck', (_req, res) => res.send('t4t ok - 0.0.1'))
    .get('/config/:table', authUser, generateTable, async (req, res) => {
      if (!(req as T4TRequest).table.view) throw new Error('Forbidden - Table Info');
      res.json((req as T4TRequest).table); // return the table info...
    })
    .post('/autocomplete/:table', authUser, generateTable, async (req, res) => {
      const t4tReq = req as T4TRequest;
      const { table } = t4tReq;
      const { key, text, search, parentTableColName, parentTableColVal, limit = 20 } = req.body;
      // TODO use key to parentTable Col

      const query = svc
        .get(table.conn)(table.name)
        .where(key, 'like', `%${search}%`)
        .orWhere(text, 'like', `%${search}%`);
      if (parentTableColName && parentTableColVal !== undefined) query.andWhere(parentTableColName, parentTableColVal); // AND filter - OK
      let rows = await query.clone().limit(limit); // TODO orderBy
      rows = rows.map(row => {
        const textKeys = text?.split(',');
        const texts: { type: string; value: unknown }[] = [];
        for (const tk of textKeys) {
          if (table.cols[tk]) {
            texts.push({
              type: 'string', // table.cols[tk].type || 'string', // should be using dependent table...
              value: row[tk],
            });
          }
        }
        return {
          key: row[key],
          text: texts.length ? texts : [{ type: 'string', value: 'ERROR' }], // text ? row[text] : row[key]
          // text: text ? row[text] : row[key],
        };
      });
      res.json(rows);
    })
    .get('/find/:table', authUser, generateTable, async (req, res) => {
      // page is 1 based
      const t4tReq = req as T4TRequest;
      return custom[t4tReq?.table?.name]?.find ? custom[t4tReq.table.name].find(t4tReq, res) : base.find(t4tReq, res);
    })
    .get('/find-one/:table', authUser, generateTable, async (req, res) => {
      const t4tReq = req as T4TRequest;
      return custom[t4tReq?.table?.name]?.findOne
        ? custom[t4tReq.table.name].findOne(t4tReq, res)
        : base.findOne(t4tReq, res);
    })
    .patch(
      '/update/:table{/:id}',
      authUser,
      generateTable,
      storageUpload().any(), // TODO what about multiple files? also need to find the column involved...
      processJson,
      async (req, res) => {
        const t4tReq = req as T4TRequest;
        return custom[t4tReq?.table?.name]?.update
          ? custom[t4tReq.table.name].update(t4tReq, res)
          : base.update(t4tReq, res);
      },
    )
    .post('/create/:table', authUser, generateTable, storageUpload().any(), processJson, async (req, res) => {
      const t4tReq = req as T4TRequest;
      return custom[t4tReq?.table?.name]?.create
        ? custom[t4tReq.table.name].create(t4tReq, res)
        : base.create(t4tReq, res);
    })
    .post('/remove/:table', authUser, generateTable, async (req, res) => {
      const t4tReq = req as T4TRequest;
      return custom[t4tReq?.table?.name]?.remove
        ? custom[t4tReq.table.name].remove(t4tReq, res)
        : base.remove(t4tReq, res);
    })
    .post(
      '/upload/:table',
      authUser,
      generateTable,
      memoryUpload(uploadMemory).single('csv-file'),
      async (req, res) => {
        const t4tReq = req as T4TRequest;
        return custom[t4tReq?.table?.name]?.upload
          ? custom[t4tReq?.table?.name]?.upload(t4tReq, res)
          : base.upload(t4tReq, res);
      },
    );

  // delete file
  // export async function deleteFile(filePath) {
  //   fs.unlink(filePath, e => {
  //     if (e) logger.info(e)
  //     else logger.info(filePath +' deleted!')
  //   })
  // }
};

export default routes;
