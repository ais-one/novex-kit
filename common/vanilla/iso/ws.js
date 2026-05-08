/**
 * WebSocket client wrapper with optional auto-reconnect on unclean close.
 */
class Ws {
  instance = null;

  /**
   * @param {object} [options]
   * @param {Function|null} [options.onmessage] - message event handler
   * @param {string|null} [options.endpoint] - WebSocket URL to connect to
   * @param {number} [options.reconnectMS] - ms to wait before reconnecting after an unclean close (0 = disabled)
   */
  constructor(options = {}) {
    this.options = {
      onmessage: null,
      endpoint: null,
      reconnectMS: 0,
    };
    Object.assign(this.options, options);
  }

  /**
   * Merge new values into the current options.
   * @param {Partial<typeof this.options>} options
   */
  setOptions(options) {
    Object.assign(this.options, options);
  }

  /** @returns {typeof this.options} */
  getOptions() {
    return this.options;
  }

  /**
   * Replace the message handler on both the options and the live socket (if connected).
   * @param {Function} onmessage
   */
  setMessage(onmessage) {
    this.options.onmessage = onmessage;
    if (this.instance) this.instance.onmessage = this.options.onmessage;
  }

  /**
   * Send a message through the open socket. No-op if not connected.
   * @param {string|ArrayBufferLike|Blob|ArrayBufferView} message
   */
  send(message) {
    if (this.instance) this.instance.send(message);
  }

  /** Close the socket and clear the instance reference. */
  close() {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  /** Open the WebSocket connection. No-op if already connected or no endpoint is set. */
  connect() {
    logger.info(`ws connecting... endpoint=${this.options.endpoint} reconnectMs=${this.options.reconnectMS}`);
    if (!this.options.endpoint) return;
    logger.info('ws connect failed - no endpoint');
    if (this.instance) return;
    logger.info('ws connect failed - already connected');

    try {
      this.instance = new WebSocket(this.options.endpoint);
      this.instance.onmessage = this.options.onmessage;
      this.instance.onclose = e => {
        if (!e.wasClean && this.options.reconnectMS) {
          setTimeout(
            () => {
              this.connect();
            },
            Math.max(this.options.reconnectMS, 1000),
          );
        } else {
          logger.info(`ws connection closed cleanly, code=${e.code} reason=${e.reason}`);
        }
      };
    } catch (e) {
      logger.info('ws connect error', e.toString());
    }
  }
}

export default Ws;
