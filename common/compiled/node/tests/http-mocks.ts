// Minimal Express req/res stubs for unit tests — no external dependencies

type ReqOptions = {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
};

export function createRequest(options: ReqOptions = {}) {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(options.headers ?? {})) {
    headers[k.toLowerCase()] = v;
  }
  return {
    body: options.body ?? {},
    query: options.query ?? {},
    headers,
    cookies: options.cookies ?? {},
    header(name: string): string | undefined {
      return headers[name.toLowerCase()];
    },
  };
}

export function createResponse() {
  return {
    statusCode: 200,
    _body: undefined as unknown,
    _redirect: undefined as string | undefined,
    _headers: {} as Record<string, string>,
    _getStatusCode() {
      return this.statusCode;
    },
    _getJSONData() {
      return this._body;
    },
    _getRedirectUrl() {
      return this._redirect;
    },
    _getHeader(name: string) {
      return this._headers[name.toLowerCase()];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this._body = data;
      return this;
    },
    redirect(urlOrStatus: string | number, url?: string) {
      if (typeof urlOrStatus === 'number') {
        this.statusCode = urlOrStatus;
        this._redirect = url;
      } else {
        this.statusCode = 302;
        this._redirect = urlOrStatus;
      }
      return this;
    },
    set(_name: string, _value: string) {
      return this;
    },
    setHeader(name: string, value: string) {
      this._headers[name.toLowerCase()] = value;
      return this;
    },
    cookie(_name: string, _value: string, _opts?: unknown) {
      return this;
    },
    clearCookie(_name: string, _opts?: unknown) {
      return this;
    },
  };
}
