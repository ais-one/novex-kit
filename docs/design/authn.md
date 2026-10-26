Here's a complete setup for both — `saml-idp` for SAML 2.0 and `oidc-provider` for OIDC, running alongside your app.

---

## Part 1: SAML — `saml-idp`

### Install & Certificates

```bash
npm install -g saml-idp

openssl req -x509 -newkey rsa:2048 -keyout idp-key.pem -out idp-cert.pem \
  -days 365 -nodes \
  -subj "/CN=saml-idp-local"
```

### Custom Test Users `idp-config.json`

By default `saml-idp` ships with a hardcoded test user.

You can override this with a JSON config file to define your own users and attributes:

```json
{
  "user": {
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@example.com",
    "userName": "testuser",
    "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "claims": {
      "firstName": "Test",
      "lastName": "User",
      "email": "testuser@example.com",
      "groups": ["admin", "user"]
    }
  }
}
```

Save as `idp-config.json` and run:

### Run

```bash
saml-idp \
  --host 127.0.0.1 \
  --port 7000 \
  --key idp-key.pem \
  --cert idp-cert.pem \
  --acsUrl http://127.0.0.1:3000/api/auth/saml \
  --audience http://127.0.0.1:3000 \
  --issuer http://127.0.0.1:7000/metadata \
  --config idp-config.json
```

The IdP will be available at:
| Endpoint                 | URL                              |
| ------------------------ | -------------------------------- |
| SSO Login                | `http://127.0.0.1:7000`          |
| Metadata                 | `http://127.0.0.1:7000/metadata` |
| IdP Login (SP-initiated) | `http://127.0.0.1:7000/saml/sso` |


## Configure Your SAML SP (Backend)

Your backend at `127.0.0.1:3000` needs to be configured with these IdP values:

```
IdP SSO URL:      http://127.0.0.1:7000/saml/sso
IdP Metadata URL: http://127.0.0.1:7000/metadata
IdP Certificate:  contents of idp-cert.pem
SP Entity ID:     http://127.0.0.1:3000
ACS URL:          http://127.0.0.1:3000/api/auth/saml
```

If your backend uses `passport-saml` or `samlify`, here's an example config:

```javascript
// passport-saml example
{
  entryPoint: 'http://127.0.0.1:7000/saml/sso',
  issuer: 'http://127.0.0.1:3000',              // SP Entity ID
  callbackUrl: 'http://127.0.0.1:3000/api/auth/saml',
  cert: fs.readFileSync('idp-cert.pem', 'utf8'), // IdP public cert
}
```

### Endpoints

|          | URL                              |
| -------- | -------------------------------- |
| IdP UI   | `http://127.0.0.1:7000`          |
| SSO      | `http://127.0.0.1:7000/saml/sso` |
| Metadata | `http://127.0.0.1:7000/metadata` |

### SP-Initiated Login Flow

When a user visits `http://127.0.0.1:3000/sso.html` and triggers login:

```
1. Frontend (sso.html)
      │
      ▼
2. Backend generates SAMLRequest
   POST/Redirect → http://127.0.0.1:7000/saml/sso
      │
      ▼
3. saml-idp shows login UI (auto-submits with test user)
      │
      ▼
4. IdP POST SAMLResponse → http://127.0.0.1:3000/api/auth/saml
      │
      ▼
5. Backend validates assertion, creates session
      │
      ▼
6. Redirect → http://127.0.0.1:3000/sso.html (logged in)
```

---

### IdP-Initiated Login Flow

You can also trigger login directly from the IdP without the SP starting the request. Hit this URL in the browser:

```
http://127.0.0.1:7000/?SAMLRequest=&RelayState=
```

Or simply open `http://127.0.0.1:7000` — it renders a form where you can edit SAML attributes on the fly before submitting, which is very handy for testing edge cases like missing claims or different `nameIdFormat` values.

---

### Quick `package.json` Script

If you want to avoid retyping the command, add it to your project:

```json
{
  "scripts": {
    "idp": "saml-idp --host 127.0.0.1 --port 7000 --key idp-key.pem --cert idp-cert.pem --acsUrl http://127.0.0.1:3000/api/auth/saml --audience http://127.0.0.1:3000 --issuer http://127.0.0.1:7000/metadata --config idp-config.json"
  }
}
```

Then just run `npm run idp`.

---

## Part 2: OIDC — `oidc-provider`

### Install

```bash
npm install oidc-provider
```

### `oidc-server.js`

```javascript
const { Provider } = require('oidc-provider');

const CLIENT_ID = 'my-app';
const CLIENT_SECRET = 'my-app-secret';
const PORT = 4000;
const ISSUER = `http://127.0.0.1:${PORT}`;

const provider = new Provider(ISSUER, {
  clients: [
    {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      redirect_uris: ['http://127.0.0.1:3000/api/auth/oidc/callback'],
      post_logout_redirect_uris: ['http://127.0.0.1:3000/sso.html'],
      token_endpoint_auth_method: 'client_secret_basic',
    },
  ],

  // In-memory adapter — no database needed for testing
  // (default, no need to specify)

  // Test user store
  async findAccount(ctx, id) {
    const users = {
      testuser: {
        sub: 'testuser',
        email: 'testuser@example.com',
        given_name: 'Test',
        family_name: 'User',
        name: 'Test User',
        groups: ['admin', 'user'],
      },
    };
    const account = users[id];
    if (!account) return undefined;
    return {
      accountId: id,
      async claims(use, scope) {
        return account;
      },
    };
  },

  // Allow http for local testing (never in production)
  cookies: {
    secure: false,
  },

  features: {
    devInteractions: { enabled: true }, // Built-in login UI for testing
  },

  scopes: ['openid', 'profile', 'email', 'offline_access'],

  claims: {
    openid: ['sub'],
    profile: ['name', 'given_name', 'family_name', 'groups'],
    email: ['email'],
  },

  pkce: {
    required: () => false, // Set true to enforce PKCE
  },
});

// Override the login interaction to auto-login as testuser
// so you don't need to type credentials every time
const {
  interactionPolicy: { Prompt, base: policy },
} = require('oidc-provider');

provider.on('server_error', (ctx, err) => {
  console.error('OIDC Provider error:', err);
});

provider.listen(PORT, '127.0.0.1', () => {
  console.log(`OIDC Provider running at ${ISSUER}`);
  console.log(`Discovery: ${ISSUER}/.well-known/openid-configuration`);
});
```

### Run

```bash
node oidc-server.js
```

### Endpoints

|               | URL                                                      |
| ------------- | -------------------------------------------------------- |
| Discovery     | `http://127.0.0.1:4000/.well-known/openid-configuration` |
| Authorization | `http://127.0.0.1:4000/auth`                             |
| Token         | `http://127.0.0.1:4000/token`                            |
| Userinfo      | `http://127.0.0.1:4000/me`                               |
| JWKS          | `http://127.0.0.1:4000/jwks`                             |
| End Session   | `http://127.0.0.1:4000/session/end`                      |

### Client config (e.g. `openid-client` / `passport-openidconnect`)

```javascript
// openid-client example
const { Issuer } = require('openid-client');

const issuer = await Issuer.discover('http://127.0.0.1:4000');

const client = new issuer.Client({
  client_id: 'my-app',
  client_secret: 'my-app-secret',
  redirect_uris: ['http://127.0.0.1:3000/api/auth/oidc/callback'],
  response_types: ['code'],
  token_endpoint_auth_method: 'client_secret_basic',
});

// Generate authorization URL
const authUrl = client.authorizationUrl({
  scope: 'openid profile email',
  response_type: 'code',
  state: 'random-state-value',
  nonce: 'random-nonce-value',
});
// Redirect user to authUrl

// Handle callback — exchange code for tokens
const params = client.callbackParams(req);
const tokenSet = await client.callback('http://127.0.0.1:3000/api/auth/oidc/callback', params, {
  state: 'random-state-value',
  nonce: 'random-nonce-value',
});

console.log('ID Token claims:', tokenSet.claims());
console.log('Access Token:', tokenSet.access_token);
```

---

## Authorization Code Flow

```
1. User visits http://127.0.0.1:3000/sso.html → clicks Login
        │
        ▼
2. Backend redirects to:
   http://127.0.0.1:4000/auth
     ?client_id=my-app
     &response_type=code
     &scope=openid profile email
     &redirect_uri=http://127.0.0.1:3000/api/auth/oidc/callback
     &state=xyz
        │
        ▼
3. oidc-provider shows login UI → user logs in as "testuser"
        │
        ▼
4. Redirects back to:
   http://127.0.0.1:3000/api/auth/oidc/callback?code=AUTH_CODE&state=xyz
        │
        ▼
5. Backend POSTs to http://127.0.0.1:4000/token
     client_id=my-app
     client_secret=my-app-secret
     grant_type=authorization_code
     code=AUTH_CODE
     redirect_uri=http://127.0.0.1:3000/api/auth/oidc/callback
        │
        ▼
6. Receives { id_token, access_token, refresh_token }
        │
        ▼
7. Backend validates id_token JWT, creates session
        │
        ▼
8. Redirect → http://127.0.0.1:3000/sso.html (logged in)
```

---

## `package.json` Scripts

```json
{
  "scripts": {
    "idp:saml": "saml-idp --host 127.0.0.1 --port 7000 --key idp-key.pem --cert idp-cert.pem --acsUrl http://127.0.0.1:3000/api/auth/saml --audience http://127.0.0.1:3000 --issuer http://127.0.0.1:7000/metadata --config idp-config.json",
    "idp:oidc": "node oidc-server.js",
    "idp:all": "concurrently \"npm run idp:saml\" \"npm run idp:oidc\""
  },
  "devDependencies": {
    "oidc-provider": "^8.0.0",
    "concurrently": "^8.0.0"
  }
}
```

Run both simultaneously with:

```bash
npm install concurrently --save-dev
npm run idp:all
```
