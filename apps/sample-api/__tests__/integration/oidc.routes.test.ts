import '@common/node/config';
import '@common/node/logger';
import assert from 'node:assert';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { type HttpResponse, httpRequest } from '@common/node/tests/http-request';
import express from 'express';
import { Provider } from 'oidc-provider';

// ─── Constants ────────────────────────────────────────────────────────────────

const OIDC_PORT = 7001;
const OIDC_URL = `http://127.0.0.1:${OIDC_PORT}`;
const OIDC_CLIENT_ID = 'test-client';
const OIDC_CLIENT_SECRET = 'test-secret';
const APP_PORT = 3001;
const APP_BASE_URL = `http://127.0.0.1:${APP_PORT}`;
const OIDC_CALLBACK = `${APP_BASE_URL}/api/oidc/auth`;

// ─── Config override (before module import) ───────────────────────────────────
// biome-ignore lint/suspicious/noExplicitAny: test config override
(globalThis as any).__config = {
  // biome-ignore lint/suspicious/noExplicitAny: spreading frozen config object
  ...(globalThis as any).__config,
  AUTH_ERROR_URL: undefined,
  OIDC_OPTIONS: {
    URL: OIDC_URL,
    CLIENT_ID: OIDC_CLIENT_ID,
    CLIENT_SECRET: OIDC_CLIENT_SECRET,
    CALLBACK: OIDC_CALLBACK,
    REISSUE: false,
  },
};

const { login, auth, refresh } = await import('@common/node/auth/controllers/oidc');

// ─── HTTP helper ──────────────────────────────────────────────────────────────

// ─── OIDC session — maintains cookies across requests ────────────────────────

class OidcSession {
  private readonly jar = new Map<string, string>();

  private saveCookies(headers: http.IncomingHttpHeaders): void {
    for (const cookie of headers['set-cookie'] ?? []) {
      const [pair] = cookie.split(';');
      const eq = pair.indexOf('=');
      if (eq !== -1) this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  private cookieHeader(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async get(url: string): Promise<HttpResponse> {
    const headers: Record<string, string> = {};
    if (this.jar.size) headers.Cookie = this.cookieHeader();
    const res = await httpRequest(url, { headers });
    this.saveCookies(res.headers);
    return res;
  }

  async post(url: string, body: string): Promise<HttpResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (this.jar.size) headers.Cookie = this.cookieHeader();
    const res = await httpRequest(url, { method: 'POST', headers, body });
    this.saveCookies(res.headers);
    return res;
  }

  // Follow GET redirects, maintaining cookies; stops at non-redirect responses
  async follow(url: string, depth = 0): Promise<HttpResponse> {
    if (depth > 8) throw new Error(`Too many redirects from ${url}`);
    const res = await this.get(url);
    if ((res.status === 301 || res.status === 302 || res.status === 303) && res.headers.location) {
      return this.follow(new URL(res.headers.location as string, url).toString(), depth + 1);
    }
    return res;
  }
}

// ─── HTML form helper ─────────────────────────────────────────────────────────

function extractFormAction(html: string): string {
  return html.match(/<form[^>]*action=["']([^"']+)["']/i)?.[1] ?? '';
}

// ─── Follow provider-internal redirects until reaching the callback URL ───────
// Stops before following the callback URL to avoid consuming the auth code.

async function followToCode(session: OidcSession, location: string, base: string): Promise<string> {
  let url = new URL(location, base).toString();
  for (let depth = 0; depth < 8; depth++) {
    if (url.startsWith(OIDC_CALLBACK)) {
      const code = new URL(url).searchParams.get('code');
      if (!code) throw new Error(`Auth code missing in callback URL: ${url}`);
      return code;
    }
    const res = await session.get(url);
    if (![301, 302, 303].includes(res.status) || !res.headers.location) {
      throw new Error(`Expected redirect at ${url}, got ${res.status}`);
    }
    url = new URL(res.headers.location as string, url).toString();
  }
  throw new Error('Too many redirects following to auth code');
}

// ─── Drive the full OIDC authorization code flow ──────────────────────────────

async function getOidcAuthCode(): Promise<string> {
  const session = new OidcSession();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC_CLIENT_ID,
    redirect_uri: OIDC_CALLBACK,
    scope: 'openid profile email offline_access',
    state: 'test',
  });

  // Follow redirects from the auth endpoint to the devInteractions login form
  const loginPage = await session.follow(`${OIDC_URL}/auth?${params}`);
  if (!loginPage.body.includes('<form')) {
    throw new Error(`OIDC login form not found — is oidc-provider running at ${OIDC_URL}?`);
  }
  const submitUrl = new URL(extractFormAction(loginPage.body), OIDC_URL).toString();

  // devInteractions accepts any login/password — the submitted login becomes the accountId
  const loginRes = await session.post(
    submitUrl,
    new URLSearchParams({ prompt: 'login', login: 'testuser', password: 'test' }).toString(),
  );

  const location = loginRes.headers.location as string;
  if (!location) throw new Error('No redirect after OIDC login POST');

  // loadExistingGrant auto-grants consent so there is no consent step
  return followToCode(session, location, OIDC_URL);
}

async function getOidcTokens(): Promise<{ access_token: string; refresh_token: string }> {
  const code = await getOidcAuthCode();
  const res = await httpRequest(`${OIDC_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: OIDC_CALLBACK,
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
    }).toString(),
  });
  const data = JSON.parse(res.body) as { access_token: string; refresh_token: string };
  if (!data.access_token) throw new Error(`Token exchange failed: ${res.body}`);
  return data;
}

// ─── Test servers lifecycle ───────────────────────────────────────────────────

describe.only('OIDC integration', () => {
  let oidcServer: http.Server;
  let appServer: http.Server;

  before(async () => {
    // biome-ignore lint/suspicious/noExplicitAny: oidc-provider has no @types package
    const provider = new (Provider as any)(OIDC_URL, {
      clients: [
        {
          client_id: OIDC_CLIENT_ID,
          client_secret: OIDC_CLIENT_SECRET,
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          redirect_uris: [OIDC_CALLBACK],
          token_endpoint_auth_method: 'client_secret_post',
        },
      ],

      async findAccount(_ctx: unknown, id: string) {
        if (id !== 'testuser') return undefined;
        return {
          accountId: id,
          async claims() {
            return { sub: id, email: 'testuser@example.com', name: 'Test User', groups: ['admin', 'user'] };
          },
        };
      },

      // Auto-grant consent for any logged-in session — eliminates the consent step in tests
      // biome-ignore lint/suspicious/noExplicitAny: oidc-provider context type
      async loadExistingGrant(ctx: any) {
        const grantId = ctx.oidc.result?.consent?.grantId || ctx.oidc.session.grantIdFor(ctx.oidc.client.clientId);
        if (grantId) return ctx.oidc.provider.Grant.find(grantId);
        if (!ctx.oidc.session.accountId) return undefined;
        const grant = new ctx.oidc.provider.Grant({
          clientId: ctx.oidc.client.clientId,
          accountId: ctx.oidc.session.accountId,
        });
        grant.addOIDCScope('openid profile email offline_access');
        await grant.save();
        return grant;
      },

      pkce: { required: () => false },
      // biome-ignore lint/suspicious/noExplicitAny: oidc-provider has no @types package
      async issueRefreshToken(_ctx: unknown, client: any) {
        return client.grantTypeAllowed('refresh_token');
      },
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      claims: {
        openid: ['sub'],
        profile: ['name', 'groups'],
        email: ['email'],
      },
      cookies: { keys: ['test-secret-key-for-oidc-provider'] },
      features: { devInteractions: { enabled: true } },
      ttl: { AccessToken: 300, AuthorizationCode: 60, RefreshToken: 3600, Interaction: 60, Session: 300 },
    });

    oidcServer = http.createServer(provider.callback());
    await new Promise<void>(resolve => oidcServer.listen(OIDC_PORT, '127.0.0.1', () => resolve()));

    const app = express();
    app.get('/api/oidc/login', login);
    app.get('/api/oidc/auth', auth);
    app.get('/api/oidc/refresh', refresh);

    await new Promise<void>(resolve => {
      appServer = app.listen(APP_PORT, '127.0.0.1', () => resolve());
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => appServer.close(err => (err ? reject(err) : resolve())));
    await new Promise<void>((resolve, reject) => oidcServer.close(err => (err ? reject(err) : resolve())));
  });

  // ─── Tests ───────────────────────────────────────────────────────────────────

  describe('OIDC — GET /api/oidc/login', () => {
    it.only('redirects to oidc-provider authorization endpoint with correct params', async () => {
      const { status, headers } = await httpRequest(`${APP_BASE_URL}/api/oidc/login`);
      assert.strictEqual(status, 302);
      const location = (headers.location as string) ?? '';
      assert.ok(location.startsWith(`${OIDC_URL}/auth`), `Expected OIDC auth redirect, got: ${location}`);
      assert.ok(location.includes(`client_id=${OIDC_CLIENT_ID}`));
      assert.ok(location.includes('response_type=code'));
    });
  });

  describe('OIDC — GET /api/oidc/auth', () => {
    it.only('redirects to callback with tokens when authorization code is valid', async () => {
      const code = await getOidcAuthCode();
      const { status, headers } = await httpRequest(`${APP_BASE_URL}/api/oidc/auth?code=${code}`);
      assert.strictEqual(status, 302);
      const location = (headers.location as string) ?? '';
      assert.ok(location.startsWith(OIDC_CALLBACK), `Expected callback redirect, got: ${location}`);
      assert.ok(location.includes('#'), 'Expected token hash fragment in redirect URL');
    });

    it.only('redirects with error fragment when authorization code is invalid', async () => {
      const { status, headers } = await httpRequest(`${APP_BASE_URL}/api/oidc/auth?code=invalid-code-xyz`);
      assert.strictEqual(status, 302);
      const location = (headers.location as string) ?? '';
      // Controller redirects even on token error — no access_token in fragment
      assert.ok(location.includes('#'), 'Expected hash fragment in redirect URL');
      assert.ok(!location.includes('access_token='), 'Should not contain a valid access_token');
    });
  });

  describe('OIDC — GET /api/oidc/refresh', () => {
    it.only('returns new access_token and refresh_token when token is provided via query param', async () => {
      const { refresh_token } = await getOidcTokens();
      const { status, body } = await httpRequest(
        `${APP_BASE_URL}/api/oidc/refresh?refresh_token=${encodeURIComponent(refresh_token)}`,
      );
      assert.strictEqual(status, 200);
      const tokens = JSON.parse(body) as { access_token: string; refresh_token: string };
      assert.ok(tokens.access_token, 'Response should contain access_token');
      assert.ok(tokens.refresh_token, 'Response should contain refresh_token');
    });

    it.only('returns new access_token and refresh_token when token is provided via request header', async () => {
      const { refresh_token } = await getOidcTokens();
      const { status, body } = await httpRequest(`${APP_BASE_URL}/api/oidc/refresh`, {
        headers: { refresh_token },
      });
      assert.strictEqual(status, 200);
      const tokens = JSON.parse(body) as { access_token: string; refresh_token: string };
      assert.ok(tokens.access_token, 'Response should contain access_token');
      assert.ok(tokens.refresh_token, 'Response should contain refresh_token');
    });

    it.only('returns 200 without access_token when refresh token is invalid', async () => {
      const { status, body } = await httpRequest(`${APP_BASE_URL}/api/oidc/refresh?refresh_token=invalid-token-xyz`);
      assert.strictEqual(status, 200);
      const tokens = JSON.parse(body) as { access_token?: string };
      assert.ok(!tokens.access_token, 'Should not return access_token for invalid refresh token');
    });
  });
}); // OIDC integration
