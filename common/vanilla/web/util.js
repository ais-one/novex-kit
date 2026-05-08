/**
 * Trigger a browser file download for the given content.
 * @param {string|Blob|ArrayBuffer} content - file content to download
 * @param {string} filename - suggested file name
 * @param {string} [type] - MIME type, default `'text/csv;charset=utf-8;'`
 */
const downloadData = (content, filename, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = globalThis.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Return a debounced version of `fn` that only fires after `delay` ms of silence.
 * @param {Function} fn - function to debounce
 * @param {number} delay - quiet period in milliseconds
 * @returns {Function}
 */
const debounce = (fn, delay) => {
  let timeoutTimerId = null;
  return (...args) => {
    clearTimeout(timeoutTimerId);
    timeoutTimerId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Return a throttled version of `fn` that fires at most once per `wait` ms.
 * @param {Function} fn - function to throttle
 * @param {number} wait - minimum interval in milliseconds
 * @returns {Function}
 */
const throttle = (fn, wait) => {
  let time = Date.now();
  return () => {
    if (time + wait - Date.now() < 0) {
      fn();
      time = Date.now();
    }
  };
};

/**
 * Return true if the string looks like a valid email address (basic pattern check).
 * Uses anchors and a negated character class to avoid ReDoS backtracking.
 * @param {string} email
 * @returns {boolean}
 */
const isEmail = email => {
  if (typeof email !== 'string' || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

/**
 * Convert an array of objects to a CSV string using JSON.stringify for each field.
 * @param {Record<string, unknown>[]} items
 * @returns {string}
 */
const jsonToCsv = items => {
  const replacer = (key, value) => (value === null ? '' : value);
  const header = Object.keys(items[0]);
  return [
    header.join(','),
    ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')),
  ].join('\r\n');
};

/**
 * Serialise a plain object to a URL query string (no leading `?`).
 * @param {Record<string, string|number>} obj
 * @returns {string} e.g. `'key1=val1&key2=val2'`
 */
const objectToQueryString = obj =>
  Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');

/**
 * Re-encode a string between two Buffer encodings (e.g. `'base64'` ↔ `'utf8'`).
 * @param {string} str
 * @param {BufferEncoding} from - source encoding
 * @param {BufferEncoding} to - target encoding
 * @returns {string}
 */
const rebaseString = (str, from, to) => Buffer.from(str, from).toString(to);

/**
 * Traverse every leaf node of a JSON structure and replace its value with `fn(value)`.
 * The object is mutated in place.
 * @param {unknown} json - value to traverse (object, array, or primitive)
 * @param {(value: unknown) => unknown} fn - transform applied to each leaf
 * @param {object|Array|null} [parent] - internal — parent container (do not pass)
 * @param {string|number|null} [key] - internal — key in parent (do not pass)
 */
const traverseJson = (json, fn, parent = null, key = null) => {
  if (typeof json === 'object') {
    if (Array.isArray(json)) {
      json.forEach((item, index) => {
        traverseJson(item, fn, json, index);
      });
    } else if (json.constructor === Object) {
      for (const k in json) traverseJson(json[k], fn, json, k);
    }
  } else if (typeof parent === 'object' && key !== null) {
    parent[key] = fn(json);
  }
};

export { debounce, downloadData, isEmail, jsonToCsv, objectToQueryString, rebaseString, throttle, traverseJson };
