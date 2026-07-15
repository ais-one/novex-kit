## Generators

Code and document generation scripts. Each generator is safe to re-run at any time.

Files inside `generated/` directories are always overwritten on every run.
Sidecar files outside `generated/` are written **once** and then owned by the developer —
the generator never touches them again.

---

### generate-crud.ts

Generates Zod schemas, Express routes, and controllers from a Drizzle schema.

Run from the schema's workspace directory (`db/sample`, `db/iam`, or `db/audit`):

```sh
npm run crud:generate   # generate:crud in db/audit
```

Or directly with custom options:

```sh
node ../../scripts/generators/generate-crud.ts \
  --schema         ../../db/sample/schema.ts \
  --schema-module  @db/sample/schema \
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

#### Multiple schemas

Each PostgreSQL schema (`sample`, `iam`, `audit`) is its own `db/<schema>/` workspace with its
own Drizzle schema file, its own `generate-crud.config.json`, and its own `crud/` output — run
the generator independently in each:

```sh
npm run crud:generate --workspace=db/sample
npm run crud:generate --workspace=db/iam
npm run generate:crud --workspace=db/audit
```

All schemas pointing to the same database use the same `--db` service name.

Tables created with `pgSchema('name').table(...)` are detected and handled identically to
plain `pgTable(...)` tables. The generated controller imports the table from the correct
schema module (`--schema-module`), and Drizzle automatically qualifies the SQL with the
right schema prefix at query time.

#### Config file

Optionally place a `generate-crud.config.json` next to `db/<schema>/package.json` to control
which tables and fields are included or excluded for that schema. Entries for tables not
present in the schema are silently ignored.

```json
{
  "$schema": "../../scripts/generators/generate-crud.config.schema.json",
  "exclude": ["fgaConfig", "rsaSigningKeys", "userCredentials"],
  "schemaOnly": ["auditLog", "hardDeleteLog", "authAuditLog", "userSessions"],
  "tables": {
    "users": {
      "excludeFromBody": ["password", "salt"],
      "excludeFromResponse": ["password", "salt"]
    },
    "iamUsers": {
      "excludeFromBody": ["email_verified_at", "phone_verified_at", "deleted_at"]
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
| `crud/<table>/generated/schema.ts` | Generator | Always overwritten |
| `crud/<table>/generated/routes.ts` | Generator | Always overwritten |
| `crud/<table>/generated/controller.ts` | Generator | Always overwritten |
| `crud/<table>/schema.ts` | Developer | Created once, never overwritten |
| `crud/<table>/controller.ts` | Developer | Created once, never overwritten |
| `crud/<table>/routes.ts` | Developer | Created once, never overwritten |

The three sidecar files (`schema.ts`, `controller.ts`, `routes.ts`) are the developer's
entry points for customisation. The generator creates them with starter content on the
first run and skips them on every subsequent run.

After generation, mount the new table's routes in the **consuming app's** `src/router.ts`
(not inside `db/<schema>/`), importing via the `@db/<schema>` package — no `.ts` extension,
the package's `exports` map appends it:

```ts
import awardRoute from '@db/sample/crud/award/routes';
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
// crud/award/controller.ts
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
// crud/award/controller.ts
export { _injectServices, default } from './generated/controller.ts';

export const search = async (req, res) => {
  // custom logic
};
```

Step 2 — add your new endpoint **before** `.use('/', generatedRoutes)` in the sidecar
`routes.ts`. The default sidecar already has this wrapper in place, so you just uncomment
and fill in the relevant line:

```ts
// crud/award/routes.ts
import express from 'express';
import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import generatedRoutes from './generated/routes.ts';
import { search } from './controller.ts';    // named export, not the default
import { AwardSearchSchema } from './schema.ts';

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

The consuming app's `router.ts` does not need to change — it already mounts
`@db/sample/crud/award/routes` (the sidecar), so whatever the sidecar exports becomes
the full router for that table.

**Adding a custom validation schema**

Schemas for custom endpoints go in the sidecar `schema.ts`. There are two cases:

**Case A — adding a brand-new schema** (e.g. for a `/search` endpoint).
Use `export *` to keep everything from generated, then add your new export alongside it.
There is no name conflict because the new export name does not exist in generated.

```ts
// crud/award/schema.ts
import { z } from 'zod';

export * from './generated/schema.ts';    // keep all generated schemas

export const AwardSearchSchema = z
  .object({ q: z.string().min(1) })
  .meta({ id: 'AwardSearch' });
```

**Case B — overriding an existing generated schema** (e.g. adding a field to `AwardBodySchema`).
You cannot use `export *` and declare the same name again — that is a duplicate export error.
Instead, re-export everything from generated individually except the one you are replacing,
then declare your own version:

```ts
// crud/award/schema.ts
import { z } from 'zod';
import { AwardBodySchema as GeneratedBodySchema } from './generated/schema.ts';

// Re-export everything from generated except AwardBodySchema (overridden below)
export {
  AwardParamsSchema,
  AwardQuerySchema,
  AwardUpdateSchema,
  AwardResponseSchema,
} from './generated/schema.ts';

// Extend the generated body schema with your extra field
export const AwardBodySchema = GeneratedBodySchema.extend({
  companyId: z.number().int(),
});
```

The OpenAPI generator reads the sidecar `schema.ts`, so it will pick up your overridden
`AwardBodySchema` and generate accurate documentation automatically.

---

### generate-openapi.ts

Generates an OpenAPI 3.1 YAML document from Zod v4 schemas.

Run from the schema's workspace directory (`db/sample`, `db/iam`, or `db/audit`):

```sh
npm run docs:generate
```

Or directly with custom options:

```sh
node ../../scripts/generators/generate-openapi.ts \
  --src        ./crud \
  --out        ./openapi/openapi.yaml \
  --prefix     /api/sample \
  --title      "Sample API" \
  --version    1.0.0 \
  --server     http://localhost:8080
```

| Flag | Required | Description |
|---|---|---|
| `--out` | yes | Output YAML file path |
| `--src` | at least one of `--src` / `--schemas` | `src/` (or `crud/`) directory containing per-table subfolders |
| `--schemas` | at least one of `--src` / `--schemas` | Directory of standalone `*.schema.ts` files (e.g. `common/schemas`) |
| `--prefix` | no | URL prefix prepended to all CRUD paths (e.g. `/api/sample-api`) |
| `--title` | no | `info.title` in the OpenAPI document (default: `API`) |
| `--version` | no | `info.version` in the OpenAPI document (default: `1.0.0`) |
| `--server` | no | Server URL in the OpenAPI document (default: `http://localhost:8080`) |

The `*ResponseSchema` export from each schema file is used as the GET response body shape.
Tables without a `ResponseSchema` export fall back to a generic object schema.

**Each schema generates its own OpenAPI doc.** The openapi generator scans `crud/<table>/schema.ts`
and `crud/<table>/generated/schema.ts` — it reads Zod files, not Drizzle schemas. Since `sample`,
`iam`, and `audit` are separate `db/<schema>/` workspaces, each has its own `docs:generate` script
and its own output file (`db/<schema>/openapi/openapi.yaml`) — run it once per schema.

The standalone `--schemas` path has its own consumer too: `common/schemas/` (hand-written, cross-cutting
schemas — not CRUD-generated) has its own `docs:generate`/`docs:validate`/`docs:make-html` scripts in
`common/schemas/package.json`, run from within that folder, producing `common/schemas/docs/openapi/openapi.merged.yaml`.
There is no root-level `docs:generate` anymore — each schema source generates and validates its own doc independently.
