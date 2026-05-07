// RFC 4180 CSV parser and generator
// https://stackoverflow.com/a/41563966
// https://www.convertcsv.com/json-to-csv.htm
// - instead of using npm libraries: csv-parse and @json2csv/plainjs
// - use process.stdout.write(...) if piping output so no extra carraige return is added
// - double quote only required if field contains newline characters
// - check if valid json key syntax
// - PROBLEMS
//   1. what if columns are not same (use less or use more) ?
//   2. what if row is missing

const DELIM_ROW = '\n'; // end of line \r\n for Windows \n for Linux
const DELIM_COL = ',';
const ESCAPE_CHAR = '""'; // this should remain as "" for RFC4180 compliance
const QUOTE_CHAR = '"';
const CHAR_CR = '\r';
const CHAR_LF = '\n';

/**
 * Advance the parser by one character and update state in place.
 * Returns the new index (may jump by 2 for escaped quotes or \r\n pairs).
 * @param {string} ch - current character
 * @param {string} next - lookahead character
 * @param {number} i - current index
 * @param {{ row: string[], field: string, inQuotes: boolean }} state
 * @param {string} delimCol
 * @param {() => void} commitRow - flush current row into rows array
 * @returns {number} next index
 */
const processChar = (ch, next, i, state, delimCol, commitRow) => {
  if (state.inQuotes) {
    if (ch === QUOTE_CHAR && next === QUOTE_CHAR) {
      state.field += QUOTE_CHAR; // "" → single "
      return i + 2;
    } else if (ch === QUOTE_CHAR) {
      state.inQuotes = false;
    } else {
      state.field += ch;
    }
  } else if (ch === QUOTE_CHAR) {
    state.inQuotes = true;
  } else if (ch === delimCol) {
    state.row.push(state.field);
    state.field = '';
  } else if (ch === CHAR_LF || ch === CHAR_CR) {
    commitRow();
    if (ch === CHAR_CR && next === CHAR_LF) return i + 2; // skip \r\n pair
  } else {
    state.field += ch;
  }
  return i + 1;
};

/**
 * RFC 4180-compliant CSV parser (handles quoted fields with embedded commas/newlines)
 * - 1. escaped correctly
 * - 2. validates uniform column count per row when `strict` is true
 * - 3. trims whitespace around fields when `trim` is true
 * @param {string} str - CSV string to parse
 * @param {string} [delimCol] - column delimiter, default `,`
 * @param {{ trim?: boolean, strict?: boolean }} [options]
 * @param {boolean} [options.trim] - trim whitespace from each field, default `false`
 * @param {boolean} [options.strict] - throw if any row has a different column count than the first row, default `false`
 * @returns {string[][]} - array of rows, each row is an array of fields
 * @throws {Error} if the CSV contains an unclosed quoted field
 * @throws {Error} if `strict` is true and a row has an inconsistent column count
 */
const parseCSV = (str, delimCol = DELIM_COL, { trim = false, strict = false } = {}) => {
  const rows = [];
  const state = { row: [], field: '', inQuotes: false };

  const commitRow = () => {
    state.row.push(state.field);
    rows.push(state.row);
    state.row = [];
    state.field = '';
  };

  let i = 0;
  while (i < str.length) {
    i = processChar(str[i], str[i + 1], i, state, delimCol, commitRow);
  }

  if (state.field || state.row.length) commitRow();
  if (state.inQuotes) throw new Error('Unclosed quoted field — invalid CSV');

  if (trim) {
    for (const row of rows) {
      for (let j = 0; j < row.length; j++) row[j] = row[j].trim();
    }
  }

  if (strict) {
    const expected = rows[0]?.length ?? 0;
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].length !== expected)
        throw new Error(`Row ${r + 1} has ${rows[r].length} columns, expected ${expected}`);
    }
  }

  return rows;
};

/**
 * Parse a CSV string and validate any fields that look like JSON.
 * @param {string} csvString - raw CSV text to parse and validate
 * @returns {{ valid: boolean, reason?: string, rows?: string[][] }}
 */
const parseAndValidateCsv = csvString => {
  try {
    const rows = parseCSV(csvString);
    for (const row of rows) {
      for (const field of row) {
        // Catches objects {}, arrays [], strings "...", numbers, booleans, null
        const looksLikeJSON = /^[[{"'\-\d]|^(true|false|null)$/.test(field.trim());
        if (looksLikeJSON) {
          try {
            JSON.parse(field);
          } catch {
            return { valid: false, reason: `Corrupted JSON in field: ${field.slice(0, 50)}` };
          }
        }
      }
    }
    return { valid: true, rows };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
};

/**
 * Convert a CSV string to an array of objects, using the first row as keys.
 * @param {object} input
 * @param {string} input._text - raw CSV text
 * @param {string} [input.delimCol] - column delimiter, default `,`
 * @param {boolean} [input.ignoreColumnMismatch] - skip rows whose column count differs from the header
 * @returns {Record<string, string>[]}
 */
const csvToJson = ({ _text, delimCol = DELIM_COL, ignoreColumnMismatch = false }) => {
  const arr = parseCSV(_text, delimCol);
  const headers = arr.shift(); // 1st row is the headers
  return arr.map(row => {
    const rv = {};
    if (headers.length !== row.length && !ignoreColumnMismatch)
      throw new Error(`Mismatch headers(${headers.length}) != columns (${row.length})`);
    headers.forEach((_, index) => {
      rv[headers[index]] = row[index];
    });
    return rv;
  });
};

/**
 * Converts an array of fields to a CSV row, escaping values as needed.
 * escape for Excel, Google Sheets, and RFC 4180-compliant parsers
 *
 * @param {*[]} fields - array of field values to convert to a CSV row
 * @param {string} [delimCol] - CSV column delimiter, default `,`
 * @returns {string} - CSV datarow string
 */
const arrayToCSVRow = (fields, delimCol = DELIM_COL) => {
  return fields
    .map(field => {
      if (field === null || field === undefined) return '';
      if (typeof field === 'object') {
        const jsonStr = JSON.stringify(field).replaceAll('"', ESCAPE_CHAR);
        return `"${jsonStr}"`;
      }
      // Wrap any plain string containing commas/quotes/newlines too
      if (typeof field === 'string' && /[",\n]/.test(field)) {
        return `"${field.replaceAll('"', ESCAPE_CHAR)}"`;
      }
      return field;
    })
    .join(delimCol);
};

/**
 * Converts JSON object values to a CSV data row, escaping values as needed.
 * escape for Excel, Google Sheets, and RFC 4180-compliant parsers
 *
 * @param {Object} jsonObj - JSON object to convert to a CSV row
 * @param {string} [delimCol] - CSV column delimiter, default `,`
 * @returns {string} - CSV data row string
 */
const jsonToCSVRow = (jsonObj, delimCol = DELIM_COL) => arrayToCSVRow(Object.values(jsonObj), delimCol);

/**
 * Converts JSON object keys to a CSV header row, escaping values as needed.
 * escape for Excel, Google Sheets, and RFC 4180-compliant parsers
 *
 * @param {Object} jsonObj - JSON object to convert to a CSV row
 * @param {string} [delimCol] - CSV column delimiter, default `,`
 * @returns {string} - CSV header row string
 */
const jsonToCSVHeader = (jsonObj, delimCol = DELIM_COL) => arrayToCSVRow(Object.keys(jsonObj), delimCol);

/**
 * Convert an array of objects to a CSV string (first row is the header).
 * @param {Record<string, unknown>[]} _json - array of objects to serialise
 * @param {string} [delimCol] - column delimiter, default `,`
 * @param {string} [delimRow] - row delimiter, default `\n`
 * @param {boolean} [ignoreColumnMismatch] - skip rows whose value count differs from the header
 * @returns {string}
 */
const jsonToCsv = (_json, delimCol = DELIM_COL, delimRow = DELIM_ROW, ignoreColumnMismatch = false) => {
  let csv = '';
  let headers = [];
  if (Array.isArray(_json))
    _json.forEach((row, index) => {
      if (index === 0) {
        // create 1st row as header
        headers = Object.keys(row);
        csv += jsonToCSVHeader(row, delimCol) + delimRow;
      }
      const data = Object.values(row);
      if (headers.length !== data.length && !ignoreColumnMismatch)
        throw new Error(`Mismatch headers(${headers.length}) != columns (${data.length})`);
      else csv += arrayToCSVRow(data, delimCol) + delimRow;
    });
  return csv;
};

export {
  arrayToCSVRow,
  csvToJson,
  jsonToCSVHeader,
  jsonToCSVRow,
  jsonToCsv,
  parseAndValidateCsv,
  parseCSV, // to array of arrays, non validating
};
