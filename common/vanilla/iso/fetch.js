// TODO add retry - https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g

/**
 * Thin fetch wrapper with JWT bearer auth, token refresh, and optional timeout.
 * Set `credentials: 'include'` to use HttpOnly cookies instead of bearer tokens.
 */
class Fetch {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl] - prepended to every relative URL
   * @param {string} [options.credentials] - fetch credentials mode (`'same-origin'` | `'include'` | `'omit'`)
   * @param {Function} [options.forceLogoutFn] - called on unrecoverable 401/403
   * @param {string} [options.refreshUrl] - endpoint used to exchange a refresh token for new tokens
   * @param {number} [options.timeoutMs] - abort after this many ms (0 = disabled)
   * @param {number} [options.maxRetry] - max retry attempts (not yet implemented)
   * @param {object} [tokens]
   * @param {string} [tokens.access] - JWT access token
   * @param {string} [tokens.refresh] - JWT refresh token
   */
  constructor(options = {}, tokens = {}) {
    this.options = {
      baseUrl: '',
      credentials: 'same-origin',
      forceLogoutFn: () => {}, // function to call when forcing a logout
      refreshUrl: '',
      timeoutMs: 0,
      maxRetry: 0,
    };
    Object.assign(this.options, options);
    this.tokens = { access: '', refresh: '' };
    Object.assign(this.tokens, tokens);
  }

  /**
   * @param {string} url
   * @param {string} [baseUrl]
   * @returns {{ urlOrigin: string, urlPath: string, urlFull: string, urlSearch: string }}
   */
  static parseUrl(url, baseUrl = '') {
    let urlOrigin = baseUrl;
    let urlPath = url;
    let urlFull = baseUrl + url;
    let urlSearch = '';
    try {
      const parsed = new URL(url);
      urlOrigin = parsed.origin;
      urlPath = parsed.pathname;
      urlFull = parsed.origin + parsed.pathname;
      urlSearch = parsed.search;
    } catch {
      // url is relative — fall back to manual search extraction
      urlSearch = url.includes('?') ? `?${url.split('?').pop()}` : '';
    }
    return { urlOrigin, urlPath, urlFull, urlSearch };
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
   * Merge new values into the current tokens.
   * @param {Partial<typeof this.tokens>} tokens
   */
  setTokens(tokens) {
    Object.assign(this.tokens, tokens);
  }

  /** @returns {typeof this.tokens} */
  getTokens() {
    return this.tokens;
  }

  /** Build a query string from a params object merged with any existing URL search. */
  #buildQs(query, urlSearch) {
    const qs =
      query && typeof query === 'object' // null is also an object
        ? '?' +
          Object.keys(query)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
            .join('&')
        : query || '';
    return qs ? qs + urlSearch.substring(1) : urlSearch;
  }

  /** Build fetch options with auth headers and optional abort signal. */
  #buildOptions(method, headers) {
    const opts = { method, headers: headers || { Accept: 'application/json' } };
    if (this.options.timeoutMs > 0) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), this.options.timeoutMs); // err.name === 'AbortError'
      opts.signal = controller.signal;
    }
    if (this.options.credentials !== 'include' && this.tokens.access) {
      // include === HTTPONLY_TOKEN
      opts.headers.Authorization = `Bearer ${this.tokens.access}`;
    }
    opts.credentials = this.options.credentials;
    return opts;
  }

  /** Attach a serialised body to fetch options based on Content-Type. */
  #setBody(opts, method, body) {
    if (!['POST', 'PATCH', 'PUT'].includes(method)) return; // check if HTTP method has req body (DELETE is maybe)
    if (body instanceof FormData) {
      opts.body = body; // Content-Type multipart/form-data NOT NEEDED, set automatically
    } else if (opts.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      opts.body = new URLSearchParams(body);
    } else if (opts.headers['Content-Type'] === 'application/octet-stream') {
      opts.body = body; // handling stream
    } else {
      opts.headers['Content-Type'] = 'application/json'; // NEEDED
      opts.body = JSON.stringify(body);
    }
  }

  /** Execute fetch and attach parsed JSON as `.data` on the Response. */
  async #fetchAndParse(urlFull, qs, opts) {
    const rv = await fetch(urlFull + qs, opts);
    const txt = await rv.text(); // handle empty body — rv.json() cannot
    rv.data = txt.length ? JSON.parse(txt) : {};
    return rv;
  }

  /** On 401 Token Expired, refresh tokens and retry the original request. Returns null if not applicable. */
  async #refreshAndRetry(rv, urlFull, qs, opts, urlOrigin) {
    if (rv.status !== 401) return null;
    if (rv.data.message !== 'Token Expired Error' || !this.options.refreshUrl) return null;

    // just throw if refresh itself errors
    const rv1 = await this.http('POST', urlOrigin + this.options.refreshUrl, {
      refresh_token: this.tokens.refresh,
    }); // rv1 JSON already processed
    this.tokens.access = rv1.data.access_token;
    this.tokens.refresh = rv1.data.refresh_token;
    if (opts.credentials !== 'include' && this.tokens.access) {
      // include === HTTPONLY_TOKEN
      opts.headers.Authorization = `Bearer ${this.tokens.access}`;
    }
    return this.#fetchAndParse(urlFull, qs, opts);
  }

  /**
   * Execute an HTTP request, handling auth headers, body serialisation, and token refresh.
   * @param {string} method - HTTP verb (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`)
   * @param {string} url - absolute URL or path relative to `baseUrl`
   * @param {object|FormData|null} [body] - request body (serialised as JSON unless FormData)
   * @param {Record<string, string>|null} [query] - query-string params appended to the URL
   * @param {Record<string, string>|null} [headers] - additional request headers
   * @returns {Promise<Response & { data: unknown }>} - fetch Response with `.data` parsed from JSON
   * @throws {Response} on non-2xx/3xx responses after exhausting refresh
   */
  async http(method, url, body = null, query = null, headers = null) {
    const { urlOrigin, urlFull, urlSearch } = Fetch.parseUrl(url, this.options.baseUrl);
    try {
      const qs = this.#buildQs(query, urlSearch);
      const opts = this.#buildOptions(method, headers);
      this.#setBody(opts, method, body);

      const rv0 = await this.#fetchAndParse(urlFull, qs, opts);
      if (rv0.status >= 200 && rv0.status < 400) return rv0;

      const rv2 = await this.#refreshAndRetry(rv0, urlFull, qs, opts, urlOrigin);
      if (rv2) return rv2;

      throw rv0; // error
    } catch (e) {
      if (e?.data?.message !== 'Token Expired Error' && (e.status === 401 || e.status === 403))
        this.options.forceLogoutFn();
      throw e; // some other error
    }
  }

  /**
   * @param {string} url
   * @param {object|FormData|null} [body]
   * @param {Record<string, string>|null} [query]
   * @param {Record<string, string>|null} [headers]
   * @returns {Promise<Response & { data: unknown }>}
   */
  async post(url, body = null, query = null, headers = null) {
    return this.http('POST', url, body, query, headers);
  }

  /**
   * @param {string} url
   * @param {object|FormData|null} [body]
   * @param {Record<string, string>|null} [query]
   * @param {Record<string, string>|null} [headers]
   * @returns {Promise<Response & { data: unknown }>}
   */
  async put(url, body = null, query = null, headers = null) {
    return this.http('PUT', url, body, query, headers);
  }

  /**
   * @param {string} url
   * @param {object|FormData|null} [body]
   * @param {Record<string, string>|null} [query]
   * @param {Record<string, string>|null} [headers]
   * @returns {Promise<Response & { data: unknown }>}
   */
  async patch(url, body = null, query = null, headers = null) {
    return this.http('PATCH', url, body, query, headers);
  }

  /**
   * @param {string} url
   * @param {Record<string, string>|null} [query]
   * @param {Record<string, string>|null} [headers]
   * @returns {Promise<Response & { data: unknown }>}
   */
  async del(url, query = null, headers = null) {
    return this.http('DELETE', url, null, query, headers);
  }

  /**
   * @param {string} url
   * @param {Record<string, string>|null} [query]
   * @param {Record<string, string>|null} [headers]
   * @returns {Promise<Response & { data: unknown }>}
   */
  async get(url, query = null, headers = null) {
    return this.http('GET', url, null, query, headers);
  }
}

export default Fetch;
