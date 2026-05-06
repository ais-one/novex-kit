// this module depends on services/db
import crypto from 'node:crypto';
// TODO JWK and JOSE
import { createRemoteJWKSet, exportJWK, importSPKI, jwtVerify } from 'jose';
import jwt, { type SignOptions } from 'jsonwebtoken';
import * as keyStore from './keystore.ts';
import * as fga from './openfga.ts';
import * as rbac from './rbac.ts';
import { findUser, getRefreshToken, setRefreshToken, setup as storeSetup } from './store.ts';

const {
  COOKIE_HTTPONLY,
  JWT_ALG,
  JWT_AUD = '',
  JWT_EXPIRY_SEC = 900,
  JWT_ISS = '',
  JWT_REFRESH_EXPIRY_SEC = 3600,
  JWT_REFRESH_TOKEN_BYTE_LEN = 32,
  JWT_SCOPE = '',
} = globalThis.__config.JWT;

const { COOKIE_OPTS } = globalThis.__config?.JWT ?? {};

const {
  AUTH_REFRESH_URL,
  AUTH_USER_FIELD_ID_FOR_JWT,
  AUTH_USER_FIELD_LOGIN,
  AUTH_USER_FIELDS_JWT_PAYLOAD = '',

  JWT_PRIVATE_KEY,
  JWT_CERTIFICATE,
  // refresh token should be a random string stored in DB or Cache, so we can revoke when needed, also handle refresh token reuse detection
  JWT_SECRET,
} = process.env;

/**
 * @param {string} tokenServiceName - service name from SERVICES_CONFIG for token storage (e.g. 'keyv')
 * @param {string} userServiceName  - service name from SERVICES_CONFIG for user lookups (e.g. 'knex1')
 * @param {(name: string) => any} lookup - services.get — resolves a name to the underlying store instance
 */
// biome-ignore lint/suspicious/noExplicitAny: lookup return type varies by store implementation
export const setup = (tokenServiceName = 'keyv', userServiceName = 'knex1', lookup: (name: string) => any) => {
  // Pass FGA_CONFIG when present; omit to skip OpenFGA and use DB roles fallback.
  const fgaConfig = globalThis.__config?.FGA_CONFIG?.storeId ? globalThis.__config.FGA_CONFIG : undefined;
  // Pass RBAC_CONFIG when enabled; omit to skip DB-backed tenant/role/permission lookup.
  const rbacConfig = globalThis.__config?.RBAC_CONFIG?.enabled ? globalThis.__config.RBAC_CONFIG : undefined;

  storeSetup(tokenServiceName, userServiceName, lookup);

  if (fgaConfig) fga.setup(fgaConfig);
  if (rbacConfig?.enabled) rbac.setup(userServiceName, lookup);
};

export const getSecret = mode => {
  return JWT_ALG.substring(0, 2) !== 'HS' ? (mode === 'sign' ? JWT_PRIVATE_KEY : JWT_CERTIFICATE) : JWT_SECRET;
};

export const createToken = async user => {
  const user_meta = {};
  const options: SignOptions = {};

  const sub = user[AUTH_USER_FIELD_ID_FOR_JWT];

  if (!sub) throw Error('User ID Not Found');
  if (user.revoked) throw Error('User Revoked');

  // Three-tier roles fallback: RBAC (active tenant) → FGA → legacy DB column.
  // Each tier is only consulted if the previous one yields no roles.
  const tenantData = await rbac.getActiveTenant(sub, user.tenant_id);
  let roles = tenantData?.roles ?? [];
  if (roles.length === 0) {
    const fgaRoles = await fga.listUserRoles(sub);
    const rawRoles = user.roles ?? '';
    const legacyRoles = Array.isArray(rawRoles) ? rawRoles.filter(Boolean) : rawRoles.split(',').filter(Boolean);
    roles = fgaRoles.length > 0 ? fgaRoles : legacyRoles;
  }

  const keys = AUTH_USER_FIELDS_JWT_PAYLOAD.split(',');
  for (const key of keys) {
    if (key && user[key] !== undefined) user_meta[key] = user[key];
  }

  options.allowInsecureKeySizes = false;
  options.algorithm = JWT_ALG;
  options.expiresIn = JWT_EXPIRY_SEC;

  const payload = {
    iss: JWT_ISS,
    sub,
    aud: JWT_AUD,
    scope: JWT_SCOPE,
    roles, // coarse-grained roles (FGA or DB column)
    ...(tenantData && { tenant_id: tenantData.tenant_id, tenant_plan: tenantData.tenant_plan }),
  };
  const access_token = jwt.sign(payload, getSecret('sign'), options);

  options.expiresIn = JWT_REFRESH_EXPIRY_SEC;
  const refresh_token = crypto.randomBytes(JWT_REFRESH_TOKEN_BYTE_LEN).toString('base64url');
  await setRefreshToken(sub, refresh_token); // store in DB or Cache
  return {
    access_token,
    refresh_token,
    user_meta,
  };
};

export const setTokensToHeader = (res, { access_token, refresh_token }) => {
  const _access_token = `Bearer ${access_token}`;
  if (COOKIE_HTTPONLY) {
    res.cookie('Authorization', _access_token, { ...COOKIE_OPTS, path: '/' });
    res.cookie('refresh_token', refresh_token, { ...COOKIE_OPTS, path: AUTH_REFRESH_URL }); // send only if path contains refresh
  } else {
    res.setHeader('Authorization', _access_token);
    res.setHeader('refresh_token', refresh_token);
  }
};

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and populates:
 *   req.user — decoded JWT payload { iss, sub, aud, scope, roles, tenant_id, tenant_plan, iat, exp }
 *   req.fga  — { check(relation, object) } for ad-hoc OpenFGA checks
 *   req.rbac — { hasRole(...roles) } checks flat JWT roles array
 *
 * For fine-grained permission checks, call rbac.getUserTenantsData(req.user.sub, req.user.tenant_id).
 */
export const authUser = async (req, res, next) => {
  let access_token = null;
  try {
    const tmp = req.cookies?.Authorization || req.header('Authorization') || req.query?.Authorization;
    access_token = tmp.split(' ')[1];
  } catch (e) {
    return res.status(401).json({ message: 'Token Format Error' });
  }
  if (access_token) {
    try {
      const access_result = jwt.verify(access_token, getSecret('verify'), {
        algorithms: [JWT_ALG],
      }) as jwt.JwtPayload & { roles?: string[] };
      if (access_result) {
        req.user = access_result;
        // Attach a scoped FGA check helper so route handlers can do ad-hoc checks
        // without importing the fga module directly.
        req.fga = {
          check: (relation, object) => fga.check(access_result.sub, relation, object),
        };
        // hasRole checks the coarse-grained flat roles array from the JWT.
        // For permission checks use rbac.getUserTenantsData with req.user.tenant_id.
        req.rbac = {
          hasRole: (...roleList) => roleList.some(r => access_result.roles?.includes(r)),
        };
        return next();
      } else {
        return res.status(401).json({ message: 'Access Error' });
      }
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token Expired Error' });
      } else {
        return res.status(401).json({ message: 'Token Error' });
      }
    }
  } else {
    return res.status(401).json({ message: 'Token Missing' });
  }
};

export const authRefresh = async (req, res) => {
  try {
    const refresh_token = req.cookies?.refresh_token || req.header('refresh_token') || req.query?.refresh_token; // check refresh token & user - always stateful
    const access_token = req.cookies?.access_token || req.header('access_token') || req.query?.access_token; // check refresh token & user - always stateful
    const user = jwt.decode(access_token) as jwt.JwtPayload;
    const { sub, iat } = user;
    if (Math.floor(Date.now() / 1000) > iat + JWT_REFRESH_EXPIRY_SEC) {
      return res.status(401).json({ message: 'Refresh Token Expired' });
    }
    const refreshToken = await getRefreshToken(sub as string);
    if (String(refreshToken) === String(refresh_token)) {
      const user = await findUser({ [AUTH_USER_FIELD_LOGIN]: sub });
      // TODO user also include tenant and other information
      const tokens = await createToken(user);
      setTokensToHeader(res, tokens);
      return res.status(200).json(tokens);
    } else {
      return res.status(401).json({ message: 'Refresh Token Error: Uncaught' });
    }
  } catch (err) {
    // use err instead of e (fix no-catch-shadow issue)
    return res.status(401).json({ message: 'Refresh Token Error' });
  }
};

// do refresh token check from backend ?
// // Signout across tabs
// window.addEventListener('storage', this.syncLogout)
//
// syncLogout (event) {
//   if (event.key === 'logout') {
//     Router.push('/login')
//   }
// }
// async function logout () {
//   const url = 'http://localhost:3010/auth/logout'
//   const response = await fetch(url, { method: 'POST', credentials: 'include', })
//   // to support logging out from all windows
//   window.localStorage.setItem('logout', Date.now())
// }

// TODO JWK and JOSE

// JWKS endpoint /.well-known/jwks.json
const jwksHandler = async (req, res) => {
  const publicKeyPem = keyStore.getPublicKey();
  const kid = keyStore.getKid();

  // convert PEM → JWK format using jose
  const cryptoKey = await importSPKI(publicKeyPem, 'ES256');
  const jwk = await exportJWK(cryptoKey);

  res.json({
    keys: [
      {
        ...jwk,
        kid,
        use: 'sig', // sig = signing key
        alg: 'ES256',
      },
    ],
  });
};

// ── issue token ────────────────────────────────────
// /auth/token
const issueToken = (req, res) => {
  const token = jwt.sign({ sub: req.body.userId, roles: req.body.roles }, keyStore.getPrivateKey(), {
    algorithm: 'ES256',
    expiresIn: '1h',
    issuer: 'https://auth.myapp.com',
    audience: 'https://api.myapp.com',
    keyid: keyStore.getKid(), // embeds kid in header
  });
  res.json({ access_token: token });
};

// fetches + caches JWKS automatically
const JWKS = createRemoteJWKSet(new URL('https://auth.myapp.com/.well-known/jwks.json'));

// ── middleware ─────────────────────────────────────
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: 'https://auth.myapp.com',
      audience: 'https://api.myapp.com',
      algorithms: ['ES256'],
    });

    req.user = payload; // { sub, roles, iat, exp, ... }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/*
const jwtPayloadSample ={
  "sub": "user_abc123",
  "email": "alice@example.com",
  "name": "Alice Cruz",
  "iss": "https://auth.myapp.com",
  "aud": ["https://api.myapp.com"], // one audience per service for microservices, or multiple audiences if token is used across services
  "iat": 1713178320,
  "exp": 1713181920,
  "jti": "550e8400-e29b-41d4-a716-446655440000",

  "tenantId": "tenant_acme",
  "roles": ["admin", "billing_manager"],
  "permissions": ["users:write", "billing:read", "reports:export"],
  "plan": "enterprise",
}

const listOfTenants = {
  "tenants": {
    "tenant_acme": {
      "name": "Acme Corp",
      "roles": ["admin", "billing_manager"],
      "plan": "enterprise",
      "permissions": ["users:write", "billing:read", "reports:export"]
    },
    "tenant_globex": {
      "name": "Globex Inc",
      "roles": ["viewer"],
      "plan": "starter",
      "permissions": ["reports:read"]
    }
  },
}
*/
