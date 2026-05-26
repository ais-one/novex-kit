## Generators

Code and document generation scripts. Each generator is safe to re-run at any time.

Files inside `generated/` directories are always overwritten on every run.
Sidecar files outside `generated/` are written **once** and then owned by the developer —
the generator never touches them again.

---

### generate-crud.ts

Generates Zod schemas, Express routes, and controllers from a Drizzle schema.

Run from an app directory:

```sh
npm run generate:crud
```

Or directly with custom options:

```sh
node ../../scripts/generators/generate-crud.ts \
  --schema         ../../common/compiled/node/services/db/schema.ts \
  --schema-module  @common/node/services/db/schema \
  --app            . \
  --db             drizzle1 \
  --tables         categories,student \
  --route-prefix   /api/sample-api
```

| Flag | Required | Description |
|---|---|---|
| `--schema` | yes | Path to the Drizzle schema `.ts` file |
| `--schema-module` | yes | Module import specifier used in generated controller imports |
| `--app` | yes | App root directory (relative to cwd) |
| `--db` | yes | Drizzle service name passed to `services.get()` |
| `--tables` | no | Comma-separated table variable names to process (default: all) |
| `--route-prefix` | no | URL prefix shown in the mount hint at the end |

Skips tables with composite primary keys or no primary key.

#### Config file

Optionally place a `generate-crud.config.json` next to `package.json` to control
which tables and fields are included or excluded:

```json
{
  "$schema": "../../scripts/generators/generate-crud.config.schema.json",
  "exclude": ["fgaConfig"],
  "schemaOnly": ["auditLog"],
  "tables": {
    "users": {
      "excludeFromBody": ["password", "salt"],
      "excludeFromResponse": ["password", "salt"]
    }
  }
}
```

| Key | Description |
|---|---|
| `exclude` | Tables to skip entirely — no schema, no routes, no controllers |
| `schemaOnly` | Tables to generate a Zod schema for, but no routes or controllers |
| `tables.<name>.excludeFromBody` | Columns removed from `BodySchema` and `UpdateSchema` (POST/PATCH) |
| `tables.<name>.excludeFromResponse` | Columns omitted from `SELECT` in generated controllers |

The companion `generate-crud.config.schema.json` provides VS Code IntelliSense for the config file.

#### Generated files

For each table, the generator produces six files:

| File | Owned by | Behaviour |
|---|---|---|
| `src/<table>/generated/schema.js` | Generator | Always overwritten |
| `src/<table>/generated/routes.ts` | Generator | Always overwritten |
| `src/<table>/generated/controller.ts` | Generator | Always overwritten |
| `src/<table>/schema.js` | Developer | Created once, never overwritten |
| `src/<table>/controller.ts` | Developer | Created once, never overwritten |
| `src/<table>/routes.ts` | Developer | Created once, never overwritten |

The three sidecar files (`schema.js`, `controller.ts`, `routes.ts`) are the developer's
entry points for customisation. The generator creates them with starter content on the
first run and skips them on every subsequent run.

After generation, register the new table in `src/router.ts`:

```ts
import awardRoute from './award/routes.ts';
// ...
router.use('/award', awardRoute);
```

#### Customising behaviour

**Overriding an existing CRUD handler**

To change how a generated endpoint behaves (e.g. make `GET /<table>/:id` also return
joined data from another table), override the method in the sidecar `controller.ts`.
The generated routes already import from `../controller.ts` (the sidecar), so the
override is picked up automatically — no changes to `routes.ts` are needed.

```ts
// src/award/controller.ts
import generatedController from './generated/controller.ts';

export { _injectServices } from './generated/controller.ts';

export default {
  ...generatedController,   // keeps create, find, update, remove as-is

  findOne: async (req, res) => {
    // replaces the generated findOne — custom logic here
  },
};
```

**Adding a new endpoint**

Adding an endpoint that does not exist in the generated routes requires two steps.

Step 1 — add a named export to the sidecar `controller.ts`:

```ts
// src/award/controller.ts
export { _injectServices, default } from './generated/controller.ts';

export const search = async (req, res) => {
  // custom logic
};
```

Step 2 — add your new endpoint **before** `.use('/', generatedRoutes)` in the sidecar
`routes.ts`. The default sidecar already has this wrapper in place, so you just uncomment
and fill in the relevant line:

```ts
// src/award/routes.ts
import express from 'express';
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import generatedRoutes from './generated/routes.ts';
import { search } from './controller.ts';    // named export, not the default
import { AwardSearchSchema } from './schema.js';

export default express
  .Router()
  .get('/search', authUser, validate('query', AwardSearchSchema), search)
  .use('/', generatedRoutes);                // all other CRUD falls through
```

The same pattern applies when overriding a route's input schema — register the
replacement route before `.use('/', generatedRoutes)` and it takes precedence:

```ts
export default express
  .Router()
  .post('/', authUser, validate('body', AwardBodySchema), awardController.create)
  .use('/', generatedRoutes);                // GET / PATCH DELETE fall through
```

`src/router.ts` does not need to change — it already mounts `./award/routes.ts`
(the sidecar), so whatever the sidecar exports becomes the full router for that table.

**Adding a custom validation schema**

Schemas for custom endpoints go in the sidecar `schema.js`. There are two cases:

**Case A — adding a brand-new schema** (e.g. for a `/search` endpoint).
Use `export *` to keep everything from generated, then add your new export alongside it.
There is no name conflict because the new export name does not exist in generated.

```js
// src/award/schema.js
import { z } from 'zod';

export * from './generated/schema.js';    // keep all generated schemas

export const AwardSearchSchema = z
  .object({ q: z.string().min(1) })
  .meta({ id: 'AwardSearch' });
```

**Case B — overriding an existing generated schema** (e.g. adding a field to `AwardBodySchema`).
You cannot use `export *` and declare the same name again — that is a duplicate export error.
Instead, re-export everything from generated individually except the one you are replacing,
then declare your own version:

```js
// src/award/schema.js
import { z } from 'zod';
import { AwardBodySchema as GeneratedBodySchema } from './generated/schema.js';

// Re-export everything from generated except AwardBodySchema (overridden below)
export {
  AwardParamsSchema,
  AwardQuerySchema,
  AwardUpdateSchema,
  AwardResponseSchema,
} from './generated/schema.js';

// Extend the generated body schema with your extra field
export const AwardBodySchema = GeneratedBodySchema.extend({
  companyId: z.number().int(),
});
```

The OpenAPI generator reads the sidecar `schema.js`, so it will pick up your overridden
`AwardBodySchema` and generate accurate documentation automatically.

---

### generate-openapi.ts

Generates an OpenAPI 3.1 YAML document from Zod v4 schemas.

Run from an app directory:

```sh
npm run docs:generate
```

Or directly with custom options:

```sh
node ../../scripts/generators/generate-openapi.ts \
  --out        ./docs/openapi/openapi.yaml \
  --prefix     /api/sample-api \
  --title      "Sample API" \
  --version    1.0.0 \
  --server     http://localhost:8080
```

| Flag | Required | Description |
|---|---|---|
| `--out` | yes | Output YAML file path |
| `--prefix` | no | URL prefix prepended to all CRUD paths (e.g. `/api/sample-api`) |
| `--title` | no | `info.title` in the OpenAPI document (default: `API`) |
| `--version` | no | `info.version` in the OpenAPI document (default: `1.0.0`) |
| `--server` | no | Server URL in the OpenAPI document (default: `http://localhost:8080`) |

The `*ResponseSchema` export from each schema file is used as the GET response body shape.
Tables without a `ResponseSchema` export fall back to a generic object schema.
