# Creating a New Backend Service

This guide walks through creating a new Express backend service from the `sample-api` template.

## Prerequisites

- Monorepo dependencies installed (`npm i` from the root)
- Node.js 24+ and npm 11+
- Familiarity with [conventions.md](conventions.md) before making code changes

---

## Step 1 — Copy the template

```bash
cp -r apps/sample-api apps/my-service
```

Use kebab-case for the folder name. Never develop directly in `sample-api` — it is a reference template.

---

## Step 2 — Update `package.json`

Edit [apps/my-service/package.json](../apps/my-service/package.json):

```json
{
  "name": "@novex-kit/my-service",
  "description": "my service description",
  ...
}
```

Then reinstall from the root so the new workspace is registered:

```bash
npm i
```

> If the root `package.json` uses `"workspaces": ["apps/*"]`, the new folder is picked up automatically.

---

## Step 3 — Configure environment

| File | Purpose |
|---|---|
| `.env` | Secrets and scalar values (`API_PORT`, DB credentials). Loaded automatically in development via `@common/node/config`. In production, inject via your deployment platform — do **not** commit this file. |
| `.env.json` | Non-sensitive structured settings exposed as `globalThis.__config`. Safe to commit. `//` line comments are allowed. |

Minimum `.env` keys to review:

```dotenv
API_PORT=3001          # change to avoid port conflict with other services
NODE_ENV=development
```

---

## Step 4 — Strip unused sample modules

The template ships with demo modules you will not need. Remove what does not apply:

| Folder | What it demos |
|---|---|
| `src/fido/` | FIDO2 / WebAuthn passkey login |
| `src/webpush/` | Web Push notifications |
| `src/sse/` | Server-Sent Events |
| `src/tests/` | Routes used only during testing |
| `src/auth/` | SAML, OIDC, OAuth, and custom auth flows |

Keep `src/base/` (healthcheck), `src/router.ts`, `src/app.ts`, and `src/index.ts` as the structural skeleton.

---

## Step 5 — Update the router

Edit [apps/my-service/src/router.ts](../apps/my-service/src/router.ts) to match your service prefix and remove imports for deleted modules:

```ts
import express from 'express';
import base from './base/routes.ts';

const router = express.Router();

export default ({ app }) => {
  app.use(
    '/api/my-service',
    router.use('/', base),
    // add your route modules here
  );
};
```

---

## Step 6 — Add your first resource

### 6a — Generate CRUD routes (optional)

If you have a Drizzle schema, update [apps/my-service/generate-crud.config.json](../apps/my-service/generate-crud.config.json) and run:

```bash
cd apps/my-service
npm run generate:crud
```

This writes generated files into `src/<table>/generated/` and creates a sidecar `src/<table>/routes.ts` for your custom extensions. The sidecar is written once and never overwritten.

Then mount the generated routes in `src/router.ts`:

```ts
import myResourceRoute from './my-resource/routes.ts';

router.use('/my-resource', myResourceRoute);
```

### 6b — Write routes manually

Create `src/my-resource/routes.ts`:

```ts
import express from 'express';

export default express
  .Router()
  .get('/', async (req, res) => {
    res.json({ items: [] });
  });
```

Mount it in `src/router.ts` as shown in Step 5.

---

## Step 7 — Run the service

```bash
cd apps/my-service
npm run start
```

Verify at `http://127.0.0.1:<API_PORT>/api/my-service/healthcheck`.

---

## Step 8 — Write tests

Tests live in `__tests__/unit/` and `__tests__/integration/`. The test runner uses `--test-only`, so **all active test suites must use `.only()`**.

```ts
// __tests__/unit/my-resource.controller.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe.only('myResourceController', () => {
  it.only('returns an array', async () => {
    assert.ok(Array.isArray([]));
  });
});
```

Run tests:

```bash
npm run test:unit
npm run test:integration
```

See [conventions.md](conventions.md) for the full testing rules (`.only()` requirement, skipping files, module mock paths).

---

## Step 9 — Generate OpenAPI docs (optional)

Update the `docs:generate` script in `package.json`:

```json
"docs:generate": "node ../../scripts/generators/generate-openapi.ts --src ./src --out ./docs/openapi/openapi.yaml --prefix /api/my-service --title \"My Service\" --version 1.0.0"
```

Then run:

```bash
npm run docs:generate
npm run docs:validate
```

---

## Step 10 — Docker build (optional)

```bash
docker build -t my-service \
  --target production \
  --build-arg APP_NAME=my-service \
  --build-arg API_PORT=3001 .

docker run -p 3001:3001 my-service
```

---

## Key rules summary

- Never commit secrets — use `.env` for development only; inject via platform in production
- Use `logger` from `@common/node/logger`, not `console.*`
- Use `@common/node/config` for config loading — do not read `process.env` directly in business logic
- Use named exports; no barrel `index.ts` files
- Follow Conventional Commits for all commit messages (`feat`, `fix`, `chore` only)

## Related docs

| Doc | Purpose |
|---|---|
| [conventions.md](conventions.md) | Coding, tooling, and runtime standards |
| [install.md](install.md) | Full setup and workspace reference |
| [git.md](git.md) | Branch and merge strategy |
| [design/authz.md](design/authz.md) | Adding RBAC or FGA authorization to routes |
| [design/authn.md](design/authn.md) | SAML / OIDC authentication setup |
