// Isomorphic logger — works in both browser and Node environments.
// Development: all levels write to the console.
// Production:  log/warn are silently dropped; error reports to the /api/logs endpoint.
//              Replace reportError() with your own Sentry / monitoring integration.
// Usage:
//   import './logger.js';
//   globalThis.logger = logger;

/**
 * Isomorphic logger. In dev, writes to the console. In production, log/warn
 * are no-ops and error() ships to the remote logging endpoint.
 */
class Logger {
  constructor() {
    this.isDev = typeof process === 'undefined' ? import.meta.env.DEV : process.env.NODE_ENV === 'development';
  }

  /**
   * @param {string} message
   * @param {unknown} [data]
   */
  log(message, data) {
    // biome-ignore lint/suspicious/noConsole: intentional console wrapper
    if (this.isDev) console.log(`[LOG] ${message}`, data);
  }

  /**
   * @param {string} message
   * @param {unknown} [data]
   */
  warn(message, data) {
    // biome-ignore lint/suspicious/noConsole: intentional console wrapper
    if (this.isDev) console.warn(`[WARN] ${message}`, data);
  }

  /**
   * In dev, writes to the console. In production, forwards to `reportError`.
   * @param {string} message
   * @param {unknown} [data]
   */
  error(message, data) {
    // biome-ignore lint/suspicious/noConsole: intentional console wrapper
    if (this.isDev) console.error(`[ERROR] ${message}`, data);
    else this.reportError(message, data);
  }

  /**
   * Ship an error to the remote logging endpoint.
   * Replace with Sentry or another monitoring integration as needed.
   * @param {string} message
   * @param {unknown} [data]
   */
  reportError(message, data) {
    if (typeof fetch !== 'undefined') {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, data, timestamp: new Date() }),
      }).catch(() => {});
    }
  }
}

export const logger = new Logger();
globalThis.logger = logger;
