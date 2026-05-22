// str.js — Safe string extraction from unknown values
//
// Prevents [object Object] stringification when converting unknown values to strings.
// Use this instead of String(val) when the value comes from untyped sources
// (e.g. req.body, webhook payloads, parsed JSON).

/**
 * Safely extract a string from an unknown value.
 * Returns the fallback if the value is null, undefined, or not a primitive.
 *
 * @param {unknown} val
 * @param {string} [fallback='']
 * @returns {string}
 *
 * @example
 * str(req.body.subject, 'Default Subject') // returns the string or fallback
 * str(undefined)                           // returns ''
 * str({ foo: 'bar' })                      // returns '' (not '[object Object]')
 */
export function str(val, fallback = '') {
  if (val == null) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}
