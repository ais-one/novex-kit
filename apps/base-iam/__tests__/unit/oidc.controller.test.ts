import '@common/node/config'; // loads .env.json → sets globalThis.__config (JWT, COOKIE_OPTS, etc.)
import '@common/node/logger';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { createRequest, createResponse } from '@common/node/tests/http-mocks';

// Spread real config (which may be frozen) into a new mutable object, then override OIDC fields
// biome-ignore lint/suspicious/noExplicitAny: test setup for globalThis
(globalThis as any).__config = {
  // biome-ignore lint/suspicious/noExplicitAny: spreading frozen config object
  ...(globalThis as any).__config,
  AUTH_ERROR_URL: 'https://app.example.com/auth-error',
  OIDC_OPTIONS: {
    URL: 'https://oidc.example.com',
    CLIENT_ID: 'test-client-id',
    CLIENT_SECRET: 'test-secret',
    CALLBACK: 'https://app.example.com/callback',
    REISSUE: false,
    ID_NAME: 'sub',
  },
};

const { login, auth, refresh } = await import('@common/node/auth/controllers/oidc');

// biome-ignore lint/suspicious/noExplicitAny: mock types are intentionally loose in tests
let req: any, res: any;

beforeEach(() => {
  req = createRequest();
  res = createResponse();
});

afterEach(() => {
  mock.restoreAll();
});

describe.skip('oidc.login', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof login, 'function');
  });

  it.only('redirects to the OIDC auth endpoint with correct query params', async () => {
    await login(req, res);
    assert.strictEqual(res._getStatusCode(), 302);
    const location = res._getRedirectUrl() as string;
    assert.ok(location.startsWith('https://oidc.example.com/auth?'), `expected OIDC auth redirect, got: ${location}`);
    assert.ok(location.includes('response_type=code'));
    assert.ok(location.includes('client_id=test-client-id'));
  });
});

describe.skip('oidc.auth', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof auth, 'function');
  });

  it.only('redirects with tokens in hash when provider returns access_token', async () => {
    req = createRequest({ query: { code: 'auth-code-123' } });

    mock.method(globalThis, 'fetch', async () => ({
      json: async () => ({ access_token: 'at-test', refresh_token: 'rt-test' }),
    }));

    await auth(req, res);

    assert.strictEqual(res._getStatusCode(), 302);
    const location = res._getRedirectUrl() as string;
    assert.ok(location.startsWith('https://app.example.com/callback#'));
    assert.ok(location.includes('at-test'));
    assert.ok(location.includes('rt-test'));
  });

  it.only('redirects to AUTH_ERROR_URL when fetch throws', async () => {
    req = createRequest({ query: { code: 'bad-code' } });

    mock.method(globalThis, 'fetch', async () => {
      throw new Error('Network error');
    });

    await auth(req, res);

    assert.strictEqual(res._getStatusCode(), 302);
    const location = res._getRedirectUrl() as string;
    assert.strictEqual(location, 'https://app.example.com/auth-error');
  });
});

describe.only('oidc.refresh', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof refresh, 'function');
  });

  it.only('returns new access_token and refresh_token', async () => {
    req = createRequest({ headers: { refresh_token: 'rt-old' } });

    mock.method(globalThis, 'fetch', async () => ({
      json: async () => ({ access_token: 'at-new', refresh_token: 'rt-new' }),
    }));

    await refresh(req, res);

    assert.strictEqual(res._getStatusCode(), 200);
    const body = res._getJSONData();
    assert.strictEqual(body.access_token, 'at-new');
    assert.strictEqual(body.refresh_token, 'rt-new');
  });
});
