// https://www.samanthaming.com/tidbits/94-how-to-check-if-object-is-empty/
/**
 * check if object is empty, also false if not object
 * @param {any} value - time to measure the number of calls
 * @returns {boolean} -  true if empty object, false otherwise
 */
export const isEmptyObject = value => value && Object.keys(value).length === 0 && value.constructor === Object;

/**
 * Return true only if the value is a plain (non-null, non-array) object.
 * @param {unknown} value
 * @returns {boolean}
 */
export const isValidObject = value => value && typeof value === 'object' && value.constructor === Object;

/** @deprecated Use `isEmptyObject` instead. */
export const emptyObjects = isEmptyObject;

/**
 * JSON.stringify replacer that handles circular references.
 * Returns '[Circular]' for any object already seen in the current serialisation.
 * @returns {(_key: string, value: unknown) => unknown}
 */
export function safeReplacer() {
  const seen = new WeakSet();
  return (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}
