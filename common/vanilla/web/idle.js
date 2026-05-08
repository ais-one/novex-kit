/**
 * Idle-time tracker. Fires configurable callbacks after periods of user inactivity.
 *
 * Usage:
 *   idleTimer.timeouts.push({ time: 300, fn: logout, stop: true });
 *   idleTimer.start();
 */
const idleTimer = {
  /** @type {{ time: number, fn: Function, stop?: boolean }[]} */
  timeouts: [],

  _idleSecondsTimer: null,
  _idleSecondsCounter: 0,
  _elapsedTsMs: 0,
  _reset: null,
  _check: null,

  /** Reset the idle counter (called on user activity events). */
  reset() {
    this._idleSecondsCounter = 0;
  },

  /** Clear the elapsed-time start timestamp. */
  clearElapsedTimeStart() {
    this._elapsedTsMs = 0;
  },

  /** Record the current timestamp as the elapsed-time start. */
  setElapsedTimeStart() {
    this._elapsedTsMs = Date.now();
  },

  /**
   * Return seconds elapsed since `setElapsedTimeStart` was called.
   * @returns {number}
   */
  getElapsedTimeSeconds() {
    return Number.parseInt((Date.now() - this._elapsedTsMs) / 1000);
  },

  /**
   * Return how many seconds the user has been idle.
   * @returns {number}
   */
  getIdleTimeSeconds() {
    return this._idleSecondsCounter;
  },

  /** Increment the idle counter and fire any callbacks whose threshold has been reached. */
  check() {
    this._idleSecondsCounter++;
    for (const timeout of this.timeouts) {
      if (this._idleSecondsCounter >= timeout.time) {
        if (timeout.stop) this.stop();
        timeout.fn();
      }
    }
  },

  /** Start tracking idle time. Attaches activity listeners and begins the 1-second tick. */
  start() {
    if (!this._reset) this._reset = this.reset.bind(this);
    if (!this._check) this._check = this.check.bind(this);

    this.setElapsedTimeStart();
    document.addEventListener('click', this._reset);
    document.addEventListener('mousemove', this._reset);
    document.addEventListener('keypress', this._reset);
    this._idleSecondsTimer = window.setInterval(this._check, 1000);
  },

  /** Stop tracking idle time and remove all activity listeners. */
  stop() {
    this.clearElapsedTimeStart();
    document.removeEventListener('click', this._reset);
    document.removeEventListener('mousemove', this._reset);
    document.removeEventListener('keypress', this._reset);
    window.clearInterval(this._idleSecondsTimer);
  },
};

export default idleTimer;
