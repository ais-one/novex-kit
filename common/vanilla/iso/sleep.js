/**
 * Wait asynchronously for the given number of milliseconds.
 * @param {number} ms - duration to sleep
 * @returns {Promise<void>}
 */
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
