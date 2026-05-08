import Fetch from './fetch.js';

let tableName = '';
let parentFilter = null;
let config = null;
let urlPrefix = '/api';
let http = new Fetch();
// Do Not Catch Errors - let it be caught by caller

/**
 * Set the active table name.
 * Call `setParentFilter(null)` explicitly when switching tables if a parent filter was active.
 * @param {string} name - T4T table name as defined in the server YAML config
 */
function setTableName(name) {
  tableName = name;
}

/**
 * Replace the Fetch instance used for all T4T requests.
 * @param {import('./fetch.js').default} _fetch
 */
const setFetch = _fetch => (http = _fetch);

/**
 * Set a parent-table filter applied to every `find` call.
 * Useful for child tables that must always be scoped to a parent row.
 * @param {{ col: string, id: unknown }|null} _filter
 */
const setParentFilter = _filter => (parentFilter = _filter);

/**
 * Override the URL prefix for all T4T endpoints (default: `'/api'`).
 * @param {string} _urlPrefix
 */
const setUrlPrefix = _urlPrefix => (urlPrefix = _urlPrefix);

/**
 * Fetch and cache the column/permission config for the active table.
 * @returns {Promise<Record<string, unknown>>} - raw config object from the server
 */
async function getConfig() {
  const { data } = await http.get(`${urlPrefix}/t4t/config/${tableName}`);
  if (data) config = data;
  return data;
}

/**
 * Fetch a paginated, filtered, and sorted list of rows from the active table.
 * @param {{ col: string, op: string, val: unknown, andOr: string }[]} filters
 * @param {{ column: string, order: 'asc'|'desc' }[]} sorter
 * @param {number} page - 1-based page number
 * @param {number} limit - rows per page
 * @returns {Promise<{ results: Record<string, unknown>[], total: number }>}
 */
async function find(filters, sorter, page, limit) {
  const rv = {
    results: [],
    total: 0,
  };
  if (parentFilter) {
    filters.push({ col: parentFilter.col, op: '=', val: parentFilter.id, andOr: 'and' });
  }
  filters = filters ? JSON.stringify(filters) : '';
  sorter = sorter ? JSON.stringify(sorter) : '';
  const { data } = await http.get(`${urlPrefix}/t4t/find/${tableName}`, {
    page,
    limit,
    filters,
    sorter,
  });
  rv.results = data.results;
  rv.total = data.total;
  return rv;
}

/**
 * Download all rows matching the given filters as a CSV string.
 * @param {{ col: string, op: string, val: unknown, andOr: string }[]} filters
 * @param {{ column: string, order: 'asc'|'desc' }[]} sorter
 * @returns {Promise<string>} - raw CSV text
 */
async function download(filters, sorter) {
  const { data } = await http.get(`${urlPrefix}/t4t/find/${tableName}`, {
    page: 0,
    limit: 0,
    filters: filters ? JSON.stringify(filters) : '',
    sorter: sorter ? JSON.stringify(sorter) : '',
    csv: 1,
  });
  return data;
}

/**
 * Fetch a single row by its primary key (or composite key, values joined by `|`).
 * @param {string} __key - primary key value, or `'val1|val2'` for composite keys
 * @returns {Promise<Record<string, unknown> & { __key: string }>}
 */
async function findOne(__key) {
  let rv = {};
  const { data } = await http.get(`${urlPrefix}/t4t/find-one/${tableName}`, { __key });
  if (data) {
    rv = data;
    rv.__key = __key;
  }
  return rv;
}

/**
 * Collect files from a FileList into rv.files (signed-URL) or rv.form (multipart).
 * Returns a comma-separated string of file names for storage in the JSON payload.
 * @param {FileList} fileList
 * @param {{ form?: FormData, files?: File[] }} rv
 * @param {boolean} signedUrl
 * @returns {string}
 */
function processFileList(fileList, rv, signedUrl) {
  const names = [];
  for (const file of fileList) {
    if (signedUrl) {
      if (!rv.files) rv.files = [];
      rv.files.push(file);
    } else {
      if (!rv.form) rv.form = new FormData();
      rv.form.append('file-data', file);
    }
    names.push(file.name);
  }
  return names.join(',');
}

/**
 * Split a record into its JSON fields and any attached files.
 * FileList values are extracted into `form` (multipart) or `files` (signed-URL upload).
 * @param {Record<string, unknown>} record - raw form data, may contain FileList values
 * @param {object} [options]
 * @param {boolean} [options.signedUrl] - when true, collect files for signed-URL upload instead of multipart
 * @returns {{ json: Record<string, unknown>, form?: FormData, files?: File[] }}
 */
function processData(record, { signedUrl = false } = {}) {
  const rv = { json: {} };
  for (const [k, v] of Object.entries(record)) {
    if (v instanceof FileList) {
      rv.json[k] = processFileList(v, rv, signedUrl);
    } else {
      rv.json[k] = v;
    }
  }
  if (rv.form) rv.form.append('json-data', JSON.stringify(rv.json));
  return rv;
}

/**
 * Create a new row in the active table.
 * @param {Record<string, unknown>|FormData} record
 * @returns {Promise<Response & { data: unknown }>}
 */
async function create(record) {
  return await http.post(`${urlPrefix}/t4t/create/${tableName}`, record);
}

/**
 * Update an existing row identified by its primary key.
 * @param {string} __key - primary key value
 * @param {Record<string, unknown>} record - fields to update
 * @param {Record<string, string>|null} [headers] - additional request headers
 * @returns {Promise<Response & { data: unknown }>}
 */
async function update(__key, record, headers = null) {
  return await http.patch(`${urlPrefix}/t4t/update/${tableName}`, record, { __key }, headers);
}

/**
 * Delete one or more rows by their primary key values.
 * @param {string[]} items - array of primary key values to delete
 * @returns {Promise<Response & { data: unknown }>}
 */
async function remove(items) {
  return await http.post(`${urlPrefix}/t4t/remove/${tableName}`, { ids: items });
}

/**
 * Upload a CSV file for bulk import into the active table.
 * @param {File|null} file - the CSV file to upload
 * @returns {Promise<Response & { data: unknown }|false>} - false if no file provided
 */
async function upload(file) {
  if (file === null) return false;
  const formData = new FormData();
  formData.append('csv-file', file);
  return await http.post(`${urlPrefix}/t4t/upload/${tableName}`, formData);
}

/**
 * Fetch autocomplete suggestions for a foreign-key column.
 * @param {string} search - current input text
 * @param {string} col - column name whose `options` config defines the lookup table
 * @param {Record<string, unknown>} record - current form record (used to resolve parent column values)
 * @param {unknown} [parentColVal] - explicit override for the parent column value
 * @returns {Promise<{ key: unknown, text: string }[]>}
 */
async function autocomplete(search, col, record, parentColVal = '') {
  const { tableName, limit, key, text, parentTableColName, parentCol } = config.cols[col].options;
  const parentTableColVal = parentTableColName ? parentColVal || record[parentCol] || '' : '';
  const { data } = await http.post(`${urlPrefix}/t4t/autocomplete/${tableName}`, {
    key,
    text,
    search,
    limit,
    parentTableColName,
    parentTableColVal,
  });
  return data;
}

export {
  autocomplete,
  create,
  download,
  find,
  findOne,
  getConfig,
  processData,
  remove,
  setFetch,
  setParentFilter,
  setTableName,
  setUrlPrefix,
  update,
  upload,
};
