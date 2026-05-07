/**
 * Fetch with AbortController timeout + retry mechanism
 *
 * Features:
 *  - Per-attempt timeout via AbortController
 *  - Exponential backoff with jitter between retries
 *  - Retries on network errors and configurable HTTP status codes
 *  - External abort signal support (cancel from outside)
 *  - Retry lifecycle hooks (onRetry)
 */

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULTS = {
  timeout: 10_000, // ms per attempt before aborting
  retries: 3, // max retry attempts (0 = no retries)
  baseDelay: 300, // ms — base for exponential backoff
  maxDelay: 10_000, // ms — cap on backoff delay
  backoffFactor: 2, // exponential multiplier
  jitter: true, // randomise delay to avoid thundering herd
  retryOn: [408, 429, 500, 502, 503, 504], // HTTP codes to retry on
  onRetry: null, // ({ attempt, error, delay }) => void
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * fetch() with per-attempt timeout and automatic retry on failure.
 *
 * @param {string}  url
 * @param {object}  [options]                - All standard fetch options, plus:
 * @param {number}  [options.timeout]        - Ms before each attempt times out
 * @param {number}  [options.retries]        - Max number of retries after first failure
 * @param {number}  [options.baseDelay]      - Initial backoff delay in ms
 * @param {number}  [options.maxDelay]       - Max backoff delay in ms
 * @param {number}  [options.backoffFactor]  - Exponential backoff multiplier
 * @param {boolean} [options.jitter]         - Add randomness to delay
 * @param {number[]} [options.retryOn]       - HTTP status codes that trigger a retry
 * @param {Function} [options.onRetry]       - Called before each retry attempt
 * @param {AbortSignal} [options.signal]     - External signal to cancel all attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}) {
  const {
    timeout,
    retries,
    baseDelay,
    maxDelay,
    backoffFactor,
    jitter,
    retryOn,
    onRetry,
    signal: externalSignal, // caller-supplied cancel signal
    ...fetchOptions // remaining standard fetch options
  } = { ...DEFAULTS, ...options };

  let attempt = 0;

  while (true) {
    // Honour external cancellation before starting each attempt
    if (externalSignal?.aborted) {
      throw new DOMException('Fetch aborted by caller', 'AbortError');
    }

    // Create a per-attempt AbortController for the timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // Merge the timeout signal with any external signal
    const signal = mergeSignals(timeoutController.signal, externalSignal);

    let response;
    let error;

    try {
      response = await fetch(url, { ...fetchOptions, signal });
    } catch (err) {
      error = err;
    } finally {
      clearTimeout(timeoutId);
    }

    // ── Determine if we should retry ────────────────────────────────────────

    const isTimeout = error?.name === 'AbortError' && timeoutController.signal.aborted;
    const isNetworkErr = error && !isTimeout;
    const isExternalAbort = externalSignal?.aborted;

    // Never retry if the caller explicitly cancelled
    if (isExternalAbort) {
      throw new DOMException('Fetch aborted by caller', 'AbortError');
    }

    const shouldRetry = shouldRetryRequest(attempt, retries, isTimeout, isNetworkErr, response, retryOn);

    if (!shouldRetry) {
      // No more retries — resolve or throw
      if (error) throw error;
      return response;
    }

    // ── Backoff before next attempt ──────────────────────────────────────────

    const delay = calcDelay({ attempt, baseDelay, maxDelay, backoffFactor, jitter });

    // Check Retry-After header on 429/503 and honour it if present
    const retryAfterMs = parseRetryAfter(response?.headers?.get('Retry-After'));
    const waitMs = Math.min(retryAfterMs ?? delay, maxDelay);

    const retryReason = getRetryReason(isTimeout, isNetworkErr, error, response, timeout);

    onRetry?.({ attempt: attempt + 1, total: retries, reason: retryReason, delay: waitMs });

    await sleep(waitMs, externalSignal); // sleep is also cancellable
    attempt++;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Exponential backoff with optional jitter */
function calcDelay({ attempt, baseDelay, maxDelay, backoffFactor, jitter }) {
  const exponential = baseDelay * backoffFactor ** attempt;
  const capped = Math.min(exponential, maxDelay);
  return jitter
    ? capped * (0.5 + Math.random() * 0.5) // jitter: 50%–100% of capped
    : capped;
}

/**
 * Merge a timeout signal with an optional external signal.
 * Aborts as soon as either signal fires.
 * Returns `timeoutSignal` directly when there is no external signal.
 * (Native AbortSignal.any() is available in Node 20+ / Chrome 116+)
 * @param {AbortSignal} timeoutSignal
 * @param {AbortSignal} [externalSignal]
 * @returns {AbortSignal}
 */
function mergeSignals(timeoutSignal, externalSignal) {
  if (!externalSignal) return timeoutSignal;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([timeoutSignal, externalSignal]);
  // Polyfill for older environments
  const controller = new AbortController();
  for (const signal of [timeoutSignal, externalSignal]) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/** @returns {boolean} */
function shouldRetryRequest(attempt, retries, isTimeout, isNetworkErr, response, retryOn) {
  if (attempt >= retries) return false;
  return isTimeout || isNetworkErr || (response != null && retryOn.includes(response.status));
}

/** @returns {string} */
function getRetryReason(isTimeout, isNetworkErr, error, response, timeout) {
  if (isTimeout) return `Timeout after ${timeout}ms`;
  if (isNetworkErr) return error.message;
  return `HTTP ${response.status}`;
}

/** Sleep for ms, but cancel early if signal fires */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/** Parse Retry-After header into milliseconds (supports seconds int and HTTP date) */
function parseRetryAfter(header) {
  if (!header) return null;
  const seconds = Number.parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = new Date(header).getTime();
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

export { fetchWithRetry };
