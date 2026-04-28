import '@common/node/config'; // loads .env.json → sets globalThis.__config (JWT, etc.)
import '@common/node/logger';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { createRequest, createResponse } from '@common/node/tests/http-mocks';
import jwtLib from 'jsonwebtoken';

// Set env vars before module load — own.ts captures these as module-level constants
process.env.AUTH_USER_FIELD_LOGIN = 'username';
process.env.AUTH_USER_FIELD_SALT = 'salt';
process.env.AUTH_USER_FIELD_PASSWORD = 'password';
process.env.AUTH_USER_FIELD_GAKEY = 'ga_key';
process.env.AUTH_USER_FIELD_ID_FOR_JWT = 'id';

// Secret used for signing test JWTs and mocked via getSecret()
process.env.JWT_SECRET ||= 'test-jwt-secret-for-unit-tests';
const TEST_SECRET = process.env.JWT_SECRET;

// Mutable state to control mock behavior per test
let findUserResult: unknown = null;
let matchScryptResult = true;
let verifyOtpResult = true;

const mockFindUser = mock.fn(async () => findUserResult);
const mockRevokeRefreshToken = mock.fn(async () => {});
const mockMatchScryptHash = mock.fn(async () => matchScryptResult);
const mockVerifyOtp = mock.fn(() => verifyOtpResult);
const mockCreateToken = mock.fn(async () => ({
  access_token: 'at-mock',
  refresh_token: 'rt-mock',
  user_meta: {},
}));
const mockSetTokensToHeader = mock.fn();
const mockGetSecret = mock.fn(() => TEST_SECRET);

// Mock internal dependencies before importing the module under test
mock.module('@common/node/auth/store', {
  namedExports: { findUser: mockFindUser, revokeRefreshToken: mockRevokeRefreshToken },
});
mock.module('@common/node/auth/scrypt', {
  namedExports: { matchScryptHash: mockMatchScryptHash },
});
mock.module('@common/node/auth/jwt', {
  namedExports: { createToken: mockCreateToken, getSecret: mockGetSecret, setTokensToHeader: mockSetTokensToHeader },
});
mock.module('otplib', {
  namedExports: { verify: mockVerifyOtp },
});

// .env sets USE_OTP=TEST for local dev — unset before import so own.ts captures it as undefined,
// allowing the normal login flow (tokens) and the real verify() path in otp to be tested.
delete process.env.USE_OTP;

const { login, logout, otp, refresh } = await import('@common/node/auth/controllers/own');

// biome-ignore lint/suspicious/noExplicitAny: mock types are intentionally loose in tests
let req: any, res: any;

beforeEach(() => {
  req = createRequest();
  res = createResponse();
  findUserResult = null;
  matchScryptResult = true;
  verifyOtpResult = true;
  mockFindUser.mock.resetCalls();
  mockRevokeRefreshToken.mock.resetCalls();
  mockMatchScryptHash.mock.resetCalls();
  mockCreateToken.mock.resetCalls();
  mockSetTokensToHeader.mock.resetCalls();
});

afterEach(() => {
  mock.restoreAll();
});

describe.only('own.login', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof login, 'function');
  });

  it.only('returns 401 when user is not found', async () => {
    req = createRequest({ body: { username: 'nobody', password: 'pw' } });
    findUserResult = null;

    await login(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.ok(res._getJSONData().message.includes('credentials'));
  });

  it.only('returns 401 when password does not match', async () => {
    req = createRequest({ body: { username: 'user1', password: 'wrong' } });
    findUserResult = { id: 'u1', username: 'user1', salt: 's', password: 'h', roles: 'admin' };
    matchScryptResult = false;

    await login(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.ok(res._getJSONData().message.includes('credentials'));
  });

  it.only('returns 401 when user is revoked', async () => {
    req = createRequest({ body: { username: 'user1', password: 'correct' } });
    findUserResult = { id: 'u1', username: 'user1', salt: 's', password: 'h', roles: 'admin', revoked: true };
    matchScryptResult = true;

    await login(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Revoked credentials');
  });

  it.only('returns 401 when user record has no id field', async () => {
    req = createRequest({ body: { username: 'user1', password: 'correct' } });
    findUserResult = { username: 'user1', salt: 's', password: 'h', roles: 'admin' }; // no id
    matchScryptResult = true;

    await login(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Authorization Format Error');
  });

  it.only('returns 200 with tokens on successful login', async () => {
    req = createRequest({ body: { username: 'user1', password: 'correct' } });
    findUserResult = { id: 'u1', username: 'user1', salt: 's', password: 'h', roles: 'admin', revoked: false };
    matchScryptResult = true;

    await login(req, res);

    assert.strictEqual(res._getStatusCode(), 200);
    const body = res._getJSONData();
    assert.strictEqual(body.access_token, 'at-mock');
    assert.strictEqual(body.refresh_token, 'rt-mock');
  });
});

describe.only('own.logout', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof logout, 'function');
  });

  it.only('returns 500 when no Authorization token is provided', async () => {
    await logout(req, res);

    assert.strictEqual(res._getStatusCode(), 500);
  });

  it.only('returns 200 and revokes token when a valid token is provided', async () => {
    const token = jwtLib.sign({ sub: 'user-1' }, TEST_SECRET);
    req = createRequest({ headers: { Authorization: `Bearer ${token}` } });

    await logout(req, res);

    assert.strictEqual(res._getStatusCode(), 200);
    assert.strictEqual(res._getJSONData().message, 'Logged Out');
    assert.strictEqual(mockRevokeRefreshToken.mock.callCount(), 1);
  });
});

describe.only('own.refresh', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof refresh, 'function');
  });

  it.only('always returns 401 with Error token revoked', async () => {
    await refresh(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Error token revoked');
  });
});

describe.only('own.otp', () => {
  it.only('is a function', () => {
    assert.strictEqual(typeof otp, 'function');
  });

  it.only('returns 401 when user is not found', async () => {
    req = createRequest({ body: { id: 'unknown', pin: '123456' } });
    findUserResult = null;

    await otp(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Error token revoked');
  });

  it.only('returns 401 when OTP pin is wrong', async () => {
    req = createRequest({ body: { id: 'u1', pin: '999999' } });
    findUserResult = { id: 'u1', ga_key: 'GA_SECRET', roles: 'admin' };
    verifyOtpResult = false;

    await otp(req, res);

    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getJSONData().message, 'Error token wrong pin');
  });

  it.only('returns 200 with tokens when OTP pin is correct', async () => {
    req = createRequest({ body: { id: 'u1', pin: '123456' } });
    findUserResult = { id: 'u1', ga_key: 'GA_SECRET', roles: 'admin' };
    verifyOtpResult = true;

    await otp(req, res);

    assert.strictEqual(res._getStatusCode(), 200);
    const body = res._getJSONData();
    assert.strictEqual(body.access_token, 'at-mock');
    assert.strictEqual(body.refresh_token, 'rt-mock');
  });
});
