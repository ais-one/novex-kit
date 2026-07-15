import '@common/node/config'; // loads .env.json → sets globalThis.__config (JWT, etc.)
import '@common/node/logger';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { createRequest, createResponse } from '@common/node/tests/http-mocks';

// Spread real config into mutable object, override OAuth fields
// biome-ignore lint/suspicious/noExplicitAny: test setup for globalThis
(globalThis as any).__config = {
  // biome-ignore lint/suspicious/noExplicitAny: spreading frozen config object
  ...(globalThis as any).__config,
  AUTH_ERROR_URL: 'https://app.example.com/auth-error',
  OAUTH_OPTIONS: {
    URL: 'https://oauth.example.com/token',
    CLIENT_ID: 'test-client-id',
    CLIENT_SECRET: 'test-secret',
    CALLBACK: 'https://app.example.com/callback',
    USER_URL: 'https://api.example.com/user',
    USER_ID: 'id',
    FIND_ID: 'oauth_id',
  },
};

// Mutable state to control mock behavior per test without re-importing
let findUserResult: unknown = null;

const mockFindUser = mock.fn(async () => findUserResult);
const mockCreateToken = mock.fn(async () => ({
  access_token: 'at-mock',
  refresh_token: 'rt-mock',
  user_meta: { email: 'test@example.com' },
}));
const mockSetTokensToHeader = mock.fn();

// Mock internal dependencies before importing the module under test
mock.module('@common/node/auth/store', {
  namedExports: { findUser: mockFindUser },
});
mock.module('@common/node/auth/jwt', {
  namedExports: { createToken: mockCreateToken, setTokensToHeader: mockSetTokensToHeader },
});

const { callbackOAuth } = await import('@common/node/auth/controllers/oauth');

// biome-ignore lint/suspicious/noExplicitAny: mock types are intentionally loose in tests
let req: any, res: any;

beforeEach(() => {
  req = createRequest({ query: { code: 'auth-code-123', state: 'state-abc' } });
  res = createResponse();
  findUserResult = null;
  mockFindUser.mock.resetCalls();
  mockCreateToken.mock.resetCalls();
  mockSetTokensToHeader.mock.resetCalls();
});

afterEach(() => {
  mock.restoreAll();
});

describe.only('oauth.callbackOAuth', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof callbackOAuth, 'function');
  });

  it.only('returns 401 when provider does not return access_token', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      json: async () => ({ error: 'bad_verification_code' }),
    }));

    await callbackOAuth(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Missing Token');
  });

  it.only('redirects to AUTH_ERROR_URL when fetch throws', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('Network error');
    });

    await callbackOAuth(req, res);

    assert.strictEqual(res._getStatusCode(), 302);
    assert.strictEqual(res._getRedirectUrl(), 'https://app.example.com/auth-error');
  });

  it.only('returns 401 when user is not found in database', async () => {
    let call = 0;
    mock.method(globalThis, 'fetch', async () => {
      call++;
      if (call === 1) return { json: async () => ({ access_token: 'at-provider' }) };
      return { json: async () => ({ id: 'oauth-uid-123' }) };
    });
    findUserResult = null; // user not in DB

    await callbackOAuth(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Unauthorized');
  });

  it.only('redirects with tokens in hash when user is found', async () => {
    let call = 0;
    mock.method(globalThis, 'fetch', async () => {
      call++;
      if (call === 1) return { json: async () => ({ access_token: 'at-provider' }) };
      return { json: async () => ({ id: 'oauth-uid-123' }) };
    });
    findUserResult = { id: 'user-1', roles: 'admin,viewer' };

    await callbackOAuth(req, res);

    assert.strictEqual(res._getStatusCode(), 302);
    const location = res._getRedirectUrl() as string;
    assert.ok(location.startsWith('https://app.example.com/callback#'));
    assert.ok(location.includes('at-mock'));
    assert.ok(location.includes('rt-mock'));
  });
});
