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
   * @param {number} [options.maxRetry] - max retry attempts (TODO, default `0`)
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
   * Parse a URL into its components, falling back to manual extraction for relative URLs.
   * @param {string} url - absolute or relative URL to parse
   * @param {string} [baseUrl] - base URL prepended to relative paths
   * @returns {{ urlOrigin: string, urlPath: string, urlFull: string, urlSearch: string }}
   */
  static parseUrl(url, baseUrl = '') {
    let urlPath = url;
    let urlOrigin = baseUrl;
    let urlFull = baseUrl + urlPath;
    let urlSearch = '';
    try {
      urlSearch = url.lastIndexOf('?') !== -1 ? url.split('?').pop() : ''; // handle /abc/def?aa=1&bb=2
      if (urlSearch) urlSearch = `?${urlSearch}`; // prepend ?
      const { origin = '', pathname = '', search = '' } = new URL(url); // http://example.com:3001/abc/ees?aa=1&bb=2
      urlOrigin = origin;
      urlPath = pathname;
      urlFull = origin + pathname;
      urlSearch = search;
    } catch (e) {}
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

  /**
   * Execute an HTTP request, handling auth headers, body serialisation, and token refresh.
   * @param {string} method - HTTP verb (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`)
   * @param {string} url - absolute URL or path relative to `baseUrl`
   * @param {object|FormData|null} [body] - request body (serialised as JSON unless FormData)
   * @param {Record<string, string>|null} [query] - query-string params appended to the URL
   * @param {Record<string, string>|null} [headers] - additional request headers
   * @returns {Promise<Response & { data: unknown }>} fetch Response with `.data` parsed from JSON
   * @throws {Response} on non-2xx/3xx responses after exhausting refresh
   */
  async http(method, url, body = null, query = null, headers = null) {
    const { urlOrigin, urlPath, urlFull, urlSearch } = Fetch.parseUrl(url, this.options.baseUrl);
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      if (this.options.timeoutMs > 0) setTimeout(() => controller.abort(), this.options.timeoutMs); // err.name === 'AbortError'

      let qs =
        query && typeof query === 'object' // null is also an object
          ? '?' +
            Object.keys(query)
              .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
              .join('&')
          : query || '';
      qs = qs
        ? qs + urlSearch.substring(1) // remove the question mark
        : urlSearch;

      if (!headers) {
        headers = {
          Accept: 'application/json',
        };
      }
      const options = { method, headers };
      if (this.options.timeoutMs > 0) options.signal = signal;
      if (this.options.credentials !== 'include') {
        // include === HTTPONLY_TOKEN
        if (this.tokens.access) options.headers.Authorization = `Bearer ${this.tokens.access}`;
      }
      options.credentials = this.options.credentials;

      if (['POST', 'PATCH', 'PUT'].includes(method)) {
        // check if HTTP method has req body (DELETE is maybe)
        if (body && body instanceof FormData) {
          options.body = body; // options.headers['Content-Type'] = 'multipart/form-data' // NOT NEEDED!!!
        } else if (
          options.headers['Content-Type'] &&
          options.headers['Content-Type'] === 'application/x-www-form-urlencoded'
        ) {
          options.body = new URLSearchParams(body); // body should be JSON
        } else if (options.headers['Content-Type'] && options.headers['Content-Type'] === 'application/octet-stream') {
          options.body = body; // handling stream...
        } else {
          options.headers['Content-Type'] = 'application/json'; // NEEDED!!!
          options.body = JSON.stringify(body);
        }
      }

      const rv0 = await fetch(urlFull + qs, options);
      const txt0 = await rv0.text(); // handle empty body as xxx.json() cannot
      rv0.data = txt0.length ? JSON.parse(txt0) : {};
      if (rv0.status >= 200 && rv0.status < 400) return rv0;
      else if (rv0.status === 401) {
        // no longer needed urlPath !== '/api/auth/refresh'
        if (rv0.data.message === 'Token Expired Error' && this.options.refreshUrl) {
          // just throw if error
          const rv1 = await this.http('POST', urlOrigin + this.options.refreshUrl, {
            refresh_token: this.tokens.refresh,
          }); // rv1 JSON already processed
          // status code should be < 400 here
          this.tokens.access = rv1.data.access_token;
          this.tokens.refresh = rv1.data.refresh_token;
          if (options.credentials !== 'include') {
            // include === HTTPONLY_TOKEN
            if (this.tokens.access) options.headers.Authorization = `Bearer ${this.tokens.access}`;
          }
          const rv2 = await fetch(urlFull + qs, options);
          const txt2 = await rv2.text();
          rv2.data = txt2.length ? JSON.parse(txt2) : {};
          return rv2;
        }
      }
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
