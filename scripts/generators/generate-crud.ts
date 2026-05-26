#!/usr/bin/env node
// scripts/generators/generate-crud.ts
//
// Generates Zod schemas, Express routes, and controllers from a Drizzle schema.
// Files inside generated/ directories are always overwritten on each run.
// Sidecar files outside generated/ are created once and then owned by the developer.
//
// Usage (run from the target app directory):
//   node ../../scripts/generators/generate-crud.ts \
//     --schema   ../../common/compiled/node/services/db/schema.ts \
//     --schema-module @common/node/services/db/schema \
//     --app      . \
//     --db       drizzle1 \
//     [--tables  categories,student] \
//     [--route-prefix /api/sample-api]
//
// Output layout (relative to --app):
//   src/<table>/generated/schema.js      ← ALWAYS overwritten (Zod schemas)
//   src/<table>/generated/routes.ts      ← ALWAYS overwritten (Express routes)
//   src/<table>/generated/controller.ts  ← ALWAYS overwritten (CRUD handlers)
//   src/<table>/schema.js                ← created ONCE  (your sidecar)
//   src/<table>/controller.ts            ← created ONCE  (your sidecar)
//   src/<table>/routes.ts                ← created ONCE  (your sidecar)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './utils.ts';

// ─── CLI argument parsing ─────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const schemaFilePath = args.schema;
const schemaModule = args['schema-module'];
const appDir = args.app;
const dbName = args.db;
const tablesFilter = args.tables ? args.tables.split(',').map(s => s.trim()) : null;
const routePrefix = args['route-prefix'] ?? '';

if (!schemaFilePath || !schemaModule || !appDir || !dbName) {
  console.error(String.raw`
Usage: node scripts/generators/generate-crud.ts \
  --schema         <path>    Path to Drizzle schema .ts file (relative to cwd)
  --schema-module  <spec>    Module import specifier for generated code
  --app            <dir>     App root directory (relative to cwd)
  --db             <name>    Drizzle service name passed to services.get()
  [--tables        <t1,t2>]  Comma-separated table variable names to process
  [--route-prefix  <prefix>] URL prefix printed in mount hint (e.g. /api/sample-api)
`);
  process.exit(1);
}

// ─── Drizzle internals (symbol-based — works across module instances) ─────────

/** Symbol used by drizzle-orm to tag the entity kind on a table constructor (e.g. `'PgTable'`). */
const ENTITY_KIND = Symbol.for('drizzle:entityKind');

/** Symbol under which drizzle-orm stores the column map on a table instance. */
const TABLE_COLUMNS = Symbol.for('drizzle:Columns');

/**
 * Returns `true` when `obj` is a drizzle-orm `PgTable` instance.
 *
 * We use `Symbol.for('drizzle:entityKind')` on the constructor rather than
 * `instanceof PgTable` because the schema file is imported via a dynamic
 * `import()` URL, which may resolve to a different module instance than the
 * one loaded by this script — making `instanceof` unreliable across ESM boundaries.
 *
 * @param obj - The value to test.
 */
function isPgTable(obj: unknown): boolean {
  // entityKind is a static property on the constructor, not on the instance
  // biome-ignore lint/suspicious/noExplicitAny: drizzle table internals
  return typeof obj === 'object' && obj !== null && (obj as any)?.constructor?.[ENTITY_KIND] === 'PgTable';
}

/**
 * Returns the column map for a drizzle-orm table.
 * The map is keyed by column variable name and the values are drizzle column objects.
 *
 * @param table - A drizzle-orm `PgTable` instance.
 * @returns A record mapping column name to the drizzle column descriptor.
 */
// biome-ignore lint/suspicious/noExplicitAny: drizzle internals are untyped here
function getColumns(table: object): Record<string, any> {
  // biome-ignore lint/suspicious/noExplicitAny: drizzle internals
  return (table as any)[TABLE_COLUMNS] ?? {};
}

// ─── SQL type → Zod code mapping ─────────────────────────────────────────────

/**
 * Maps a Drizzle / PostgreSQL SQL type string to the corresponding Zod v4 schema code snippet.
 *
 * The returned string is embedded verbatim into generated schema files, so it must be
 * valid JavaScript/TypeScript using the `z` import already present in those files.
 *
 * Handling notes:
 * - `serial` / `bigserial` are mapped to `z.number().int().positive()` because Drizzle
 *   exposes them as plain `integer` at the JS layer but the PK is always > 0.
 * - `numeric` / `decimal` are mapped to `z.string()` because drizzle-orm returns these
 *   as strings to avoid floating-point precision loss.
 * - `inet` and `text[]` are custom column types; they resolve to `string` and
 *   `string[]` respectively based on how they are handled in this codebase.
 * - Unknown types fall back to `z.unknown()` so the file still compiles.
 *
 * @param sqlType - The raw SQL type string as returned by `col.getSQLType()` (e.g. `'varchar(255)'`, `'integer'`).
 * @returns A Zod schema code snippet string (e.g. `'z.string()'`, `'z.number().int()'`).
 */
function sqlTypeToZodCode(sqlType: string): string {
  const base = sqlType.toLowerCase().split('(')[0].split(' ')[0].trim();
  switch (base) {
    case 'serial':
    case 'bigserial':
      return 'z.number().int().positive()';
    case 'integer':
    case 'int':
    case 'int2':
    case 'int4':
    case 'int8':
    case 'bigint':
      return 'z.number().int()';
    case 'varchar':
    case 'character':
    case 'char':
    case 'text':
      return 'z.string()';
    case 'boolean':
    case 'bool':
      return 'z.boolean()';
    case 'numeric':
    case 'decimal':
      return 'z.string()'; // drizzle-orm returns numeric as string
    case 'timestamp':
    case 'date':
    case 'time':
      return 'z.string()';
    case 'jsonb':
    case 'json':
      return 'z.record(z.unknown())';
    case 'uuid':
      return 'z.string().uuid()';
    case 'inet':
      return 'z.string()'; // custom inet type — underlying data is string
    case 'text[]':
      return 'z.array(z.string())'; // custom textArray type — underlying data is string[]
    default:
      return 'z.unknown()';
  }
}

// ─── Naming helpers ───────────────────────────────────────────────────────────

/**
 * Uppercases the first character of a string.
 * Used to convert a camelCase Drizzle table variable name (e.g. `'categories'`)
 * into the PascalCase prefix used for generated schema and controller exports
 * (e.g. `'Categories'`).
 *
 * @param str - The string to convert.
 * @returns The input string with its first character uppercased.
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a camelCase or PascalCase identifier to kebab-case.
 * Used to produce the file name stem for generated files.
 *
 * @example `'fgaConfig'` → `'fga-config'`, `'auditLog'` → `'audit-log'`
 *
 * @param str - The camelCase or PascalCase identifier to convert.
 * @returns The kebab-case equivalent.
 */
function toKebabCase(str: string): string {
  return str.replaceAll(/([A-Z])/g, m => `-${m.toLowerCase()}`).replace(/^-/, '');
}

// ─── File helpers ─────────────────────────────────────────────────────────────

/**
 * Writes `content` to `filePath`, creating any intermediate directories as needed.
 * Always overwrites the file if it already exists.
 *
 * @param filePath - Absolute path of the file to write.
 * @param content  - UTF-8 string content to write.
 */
function writeFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Writes `content` to `filePath` only when the file does not already exist.
 * Used for sidecar files that are created once and then owned by the developer.
 *
 * @param filePath - Absolute path of the file to create.
 * @param content  - UTF-8 string content to write.
 * @returns `true` if the file was created, `false` if it already existed.
 */
function writeIfAbsent(filePath: string, content: string): boolean {
  if (existsSync(filePath)) return false;
  writeFile(filePath, content);
  return true;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Shape of the optional `generate-crud.config.json` file placed at the app root.
 *
 * The config file lets you control table-level and field-level generation behaviour
 * without modifying the generator script itself. Place it alongside `package.json`
 * and point VS Code IntelliSense at the companion JSON Schema via `"$schema"`:
 *
 * ```json
 * {
 *   "$schema": "../../scripts/generators/generate-crud.config.schema.json"
 * }
 * ```
 */
interface CrudConfig {
  /** Tables to skip entirely — no Zod schema, no routes, no controllers generated. */
  exclude?: string[];
  /**
   * Tables to generate a Zod schema for, but NOT routes or controllers.
   * Useful for documenting table shapes in OpenAPI without exposing public CRUD endpoints.
   */
  schemaOnly?: string[];
  /** Per-table field-level exclusions, keyed by Drizzle table variable name. */
  tables?: Record<
    string,
    {
      /**
       * Column names to remove from BodySchema and UpdateSchema.
       * Use for server-managed fields that clients must never supply directly
       * (e.g. password hashes, OTP pins, security counters).
       */
      excludeFromBody?: string[];
      /**
       * Column names to omit from SELECT in generated controllers.
       * Produces an explicit column list so sensitive data is never returned
       * in API responses (e.g. password, salt, gaKey).
       */
      excludeFromResponse?: string[];
    }
  >;
}

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Describes a single field in the generated `BodySchema` (POST) and `UpdateSchema` (PATCH).
 * Fields excluded via `excludeFromBody` config or those that are primary-key / SQL-expression
 * columns are never represented here.
 */
interface BodyField {
  /** Column name as it appears in the Drizzle schema. */
  name: string;
  /** Zod schema code snippet for this field (e.g. `'z.string()'`). */
  zodCode: string;
  /**
   * Whether the field is required in the body schema.
   * `true` when the column is `NOT NULL` and has no default value;
   * `false` when the column is nullable or has a default (optional in POST body).
   */
  required: boolean;
}

/**
 * Metadata for a single column included in the generated `ResponseSchema`.
 * Used to build the Zod schema that describes what the API returns on GET requests.
 */
interface ResponseField {
  /** Column name as it appears in the Drizzle schema. */
  name: string;
  /** Zod schema code snippet for this field (e.g. `'z.string()'`). */
  zodCode: string;
  /** `true` if the column is nullable — appends `.nullable()` in the generated schema. */
  nullable: boolean;
}

/**
 * Aggregates all per-table metadata needed by the code generators.
 * Constructed once per table in the main loop and passed to every `generate*` function.
 */
interface TableInfo {
  /** Drizzle export variable name (camelCase), e.g. `'categories'`, `'fgaConfig'`. */
  varName: string;
  /** PascalCase prefix used for generated export names, e.g. `'Categories'`. */
  pascalName: string;
  /** Kebab-case stem used for file names and URL segments, e.g. `'fga-config'`. */
  kebabName: string;
  /** Name of the primary key column, e.g. `'id'` or `'code'`. */
  pkColName: string;
  /**
   * `true` when the primary key is a numeric type (`serial`, `integer`, etc.).
   * Controls whether generated param schemas use `z.coerce.number()` or `z.string()`.
   */
  pkIsNumeric: boolean;
  /** Ordered list of fields included in the generated `BodySchema` and `UpdateSchema`. */
  bodyFields: BodyField[];
  /**
   * All columns except those in `excludeFromResponse`, used to build the generated
   * `ResponseSchema` and for explicit SELECT column lists in controllers.
   * Carries nullable information so the schema accurately reflects DB constraints.
   */
  responseFields: ResponseField[];
  /**
   * All column names for this table.
   * Used to build an explicit SELECT column list when `excludeFromResponse` is non-empty,
   * ensuring sensitive columns are never returned in API responses.
   */
  allColNames: string[];
  /**
   * Column names to omit from SELECT queries in generated controllers.
   * When non-empty, the controller uses an explicit column list instead of `SELECT *`.
   * Sourced from `generate-crud.config.json → tables.<name>.excludeFromResponse`.
   */
  excludeFromResponse: string[];
}

// ─── Code generators ─────────────────────────────────────────────────────────

/**
 * Returns the standard auto-generated file header comment.
 * Placed at the top of every file inside `generated/` to discourage manual edits
 * and to identify the source Drizzle table.
 *
 * @param varName - The Drizzle table variable name used as the source label.
 */
const AUTO_HEADER = (varName: string) => `\
// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run \`npm run generate:crud\` to regenerate this file.
// Source table: ${varName}
// ─────────────────────────────────────────────────────────────────────────────
`;

/**
 * Generates the content of a `schemas/generated/<table>.schema.js` file.
 *
 * The file exports four Zod schemas registered with `.meta({ id })` so that
 * `generate-openapi.ts` can reference them as named OpenAPI components:
 * - `${Pascal}BodySchema`     — fields accepted on `POST /<table>` (excludes PK, SQL-expression defaults, and `excludeFromBody` columns)
 * - `${Pascal}UpdateSchema`   — same fields but all optional (for `PATCH`)
 * - `${Pascal}ParamsSchema`   — single-field object holding the primary key (for URL params)
 * - `${Pascal}QuerySchema`    — pagination params (`limit` and `page`) for `GET /<table>`
 * - `${Pascal}ResponseSchema` — all columns minus `excludeFromResponse`, used as the GET response body in OpenAPI
 *
 * @param info - Aggregated table metadata built in the main loop.
 * @returns The full file content as a UTF-8 string ready to be written to disk.
 */
function generateSchemaFile(info: TableInfo): string {
  const { varName, pascalName, kebabName, pkColName, pkIsNumeric, bodyFields, responseFields } = info;

  const pkZodCode = pkIsNumeric ? 'z.coerce.number().int().positive()' : 'z.string().min(1)';
  const pkExample = pkIsNumeric ? '1' : "'example-id'";

  const bodyLines = bodyFields.map(f => `    ${f.name}: ${f.zodCode}${f.required ? '' : '.optional()'},`).join('\n');
  const responseLines = responseFields
    .map(f => `    ${f.name}: ${f.zodCode}${f.nullable ? '.nullable()' : ''},`)
    .join('\n');

  return `${AUTO_HEADER(varName)}import { z } from 'zod';

// Insert body — fields accepted on POST /${kebabName}
export const ${pascalName}BodySchema = z
  .object({
${bodyLines}
  })
  .meta({ id: '${pascalName}Body' });

// Partial update — all fields optional for PATCH /${kebabName}/:${pkColName}
export const ${pascalName}UpdateSchema = ${pascalName}BodySchema.partial().meta({ id: '${pascalName}Update' });

// URL params — :${pkColName} on /:${pkColName} routes
export const ${pascalName}ParamsSchema = z
  .object({
    ${pkColName}: ${pkZodCode}.meta({ example: ${pkExample} }),
  })
  .meta({ id: '${pascalName}Params' });

// Query params — pagination for GET /${kebabName}
export const ${pascalName}QuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(10).meta({ example: 10 }),
    page: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
  })
  .meta({ id: '${pascalName}Query' });

// Full row as returned by SELECT — columns in excludeFromResponse are omitted
export const ${pascalName}ResponseSchema = z
  .object({
${responseLines}
  })
  .meta({ id: '${pascalName}Response' });
`;
}

/**
 * Generates the content of a `src/routes/generated/<table>.ts` file.
 *
 * The file exports a single Express `Router` that wires up the five standard CRUD
 * operations, each protected by `authUser` middleware and validated against the
 * corresponding generated Zod schema:
 * - `POST   /`         — create
 * - `GET    /`         — list (paginated)
 * - `GET    /:pk`      — find one
 * - `PATCH  /:pk`      — partial update
 * - `DELETE /:pk`      — remove
 *
 * The route delegates all business logic to the sidecar controller
 * (`src/controllers/<table>.ts`) so developer overrides are picked up automatically.
 *
 * @param info - Aggregated table metadata built in the main loop.
 * @returns The full file content as a UTF-8 string ready to be written to disk.
 */
function generateRouteFile(info: TableInfo): string {
  const { varName, pascalName, kebabName, pkColName } = info;

  return `${AUTO_HEADER(varName)}import { authUser } from '@common/node/auth/jwt';
import { validate } from '@common/node/errors/validate';
import express from 'express';
import {
  ${pascalName}BodySchema,
  ${pascalName}ParamsSchema,
  ${pascalName}QuerySchema,
  ${pascalName}UpdateSchema,
} from './schema.js';
// Imports from the sidecar controller so developer overrides are picked up automatically.
import ${varName}Controller from '../controller.ts';

export default express
  .Router()
  .post('/', authUser, validate('body', ${pascalName}BodySchema), ${varName}Controller.create)
  .get('/', authUser, validate('query', ${pascalName}QuerySchema), ${varName}Controller.find)
  .get('/:${pkColName}', authUser, validate('params', ${pascalName}ParamsSchema), ${varName}Controller.findOne)
  .patch(
    '/:${pkColName}',
    authUser,
    validate('params', ${pascalName}ParamsSchema),
    validate('body', ${pascalName}UpdateSchema),
    ${varName}Controller.update,
  )
  .delete('/:${pkColName}', authUser, validate('params', ${pascalName}ParamsSchema), ${varName}Controller.remove);
`;
}

/**
 * Generates the content of a `src/controllers/generated/<table>.ts` file.
 *
 * The file exports five async Express handler functions (`create`, `find`, `findOne`,
 * `update`, `remove`) that implement standard CRUD operations using Drizzle ORM.
 *
 * When `excludeFromResponse` is non-empty, the generated `select()` call uses an
 * explicit column map instead of `SELECT *`, ensuring that sensitive fields (e.g.
 * `password`, `salt`) are never returned in list or detail responses.
 *
 * The file also exports `_injectServices` so unit tests can substitute a mock
 * without needing ESM module mocking.
 *
 * @param info - Aggregated table metadata built in the main loop.
 * @returns The full file content as a UTF-8 string ready to be written to disk.
 */
function generateControllerFile(info: TableInfo): string {
  const { varName, pkColName, pkIsNumeric, allColNames, excludeFromResponse } = info;
  const pkExpr = pkIsNumeric ? `Number(req.params.${pkColName})` : `req.params.${pkColName}`;

  // Build explicit column select when sensitive fields must be excluded from responses
  const safeColNames = allColNames.filter(c => !excludeFromResponse.includes(c));
  const hasExclusions = excludeFromResponse.length > 0;
  const selectArgLines = safeColNames.map(c => `      ${c}: table.${c},`).join('\n');
  const selectCall = hasExclusions ? `.select({\n${selectArgLines}\n    })` : '.select()';

  return `${AUTO_HEADER(varName)}import * as realServices from '@common/node/services';
import { ${varName} as table } from '${schemaModule}';
import { eq } from 'drizzle-orm';

// biome-ignore lint/suspicious/noExplicitAny: services interface varies by store type
let services: any = realServices;

// Allows unit tests to inject a mock without needing ESM module mocking
// biome-ignore lint/suspicious/noExplicitAny: test injection
export const _injectServices = (mock: any) => {
  services = mock;
};

const db = () => services.get('${dbName}');

const create = async (req, res) => {
  const result = await db().insert(table).values(req.body).returning({ ${pkColName}: table.${pkColName} });
  return res.status(201).json(result[0]);
};

const findOne = async (req, res) => {
  const rows = await db()
    ${selectCall}
    .from(table)
    .where(eq(table.${pkColName}, ${pkExpr}))
    .limit(1);
  if (rows.length) return res.status(200).json(rows[0]);
  return res.status(404).json({});
};

const update = async (req, res) => {
  const result = await db()
    .update(table)
    .set(req.body)
    .where(eq(table.${pkColName}, ${pkExpr}));
  const count = result.rowCount ?? 0;
  return res.status(count ? 200 : 404).json({ count });
};

const find = async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const page = req.query.page ? Number(req.query.page) : 0;
  const result = await db()
    ${selectCall}
    .from(table)
    .limit(limit)
    .offset((page > 0 ? page - 1 : 0) * limit);
  return res.status(200).json(result);
};

const remove = async (req, res) => {
  const result = await db()
    .delete(table)
    .where(eq(table.${pkColName}, ${pkExpr}));
  const count = result.rowCount ?? 0;
  return res.status(count ? 200 : 404).json({ count });
};

export default { create, findOne, update, find, remove };
`;
}

/**
 * Header comment placed at the top of every sidecar file.
 * Reminds the developer that this file is theirs to edit and will not be overwritten.
 */
const SIDECAR_HEADER = `\
// ─────────────────────────────────────────────────────────────────────────────
// Sidecar — created once, then YOURS. Will NOT be overwritten by generate:crud.
// Extend or override the generated code below as needed.
// ─────────────────────────────────────────────────────────────────────────────
`;

/**
 * Generates the content of a sidecar schema file (`schemas/<table>.schema.js`).
 *
 * The sidecar is created once the first time `generate:crud` runs for the table.
 * It re-exports everything from the corresponding generated schema file so that
 * route imports automatically pick up the latest generated shapes. Developers can
 * add or override exports below the re-export line (e.g. custom search schemas).
 *
 * This file is NEVER overwritten on subsequent runs.
 *
 * @param info - Aggregated table metadata built in the main loop.
 * @returns The full file content as a UTF-8 string ready to be written to disk.
 */
function generateSidecarSchema(info: TableInfo): string {
  const { pascalName } = info;
  return `${SIDECAR_HEADER}// Re-export everything from generated — add custom schemas below.
export * from './generated/schema.js';

// Example: add a custom search schema
// import { z } from 'zod';
// export const ${pascalName}SearchSchema = z.object({ q: z.string().min(1) }).meta({ id: '${pascalName}Search' });
`;
}

/**
 * Generates the content of a sidecar controller file (`src/controllers/<table>.ts`).
 *
 * The sidecar is created once the first time `generate:crud` runs for the table.
 * It re-exports the generated controller as the default export so the route file
 * continues to work without changes. Developers can override individual handler
 * methods by spreading the generated controller and replacing specific keys.
 *
 * This file is NEVER overwritten on subsequent runs.
 *
 * @param info - Aggregated table metadata built in the main loop.
 * @returns The full file content as a UTF-8 string ready to be written to disk.
 */
function generateSidecarController(info: TableInfo): string {
  const { varName } = info;
  return `${SIDECAR_HEADER}// Re-export the generated controller as the default — override methods below.
export { default } from './generated/controller.ts';

// Example: override specific methods
// import generatedController from './generated/controller.ts';
// import type { Request, Response } from 'express';
//
// export default {
//   ...generatedController,
//   create: async (req: Request, res: Response) => {
//     // custom create logic for ${varName}
//   },
// };
`;
}

/**
 * Generates the content of a sidecar routes file (`src/<table>/routes.ts`).
 *
 * The sidecar is created once the first time `generate:crud` runs for the table.
 * By default it re-exports the generated router unchanged. Developers extend it
 * by combining the generated router with their own custom endpoints.
 *
 * This file is NEVER overwritten on subsequent runs.
 *
 * @param info - Aggregated table metadata built in the main loop.
 * @returns The full file content as a UTF-8 string ready to be written to disk.
 */
function generateSidecarRoutes(info: TableInfo): string {
  const { varName, pascalName } = info;
  return `${SIDECAR_HEADER}import express from 'express';
import generatedRoutes from './generated/routes.ts';

// Add custom endpoints or override route schemas BEFORE .use('/', generatedRoutes).
// Express matches in registration order — the first matching handler wins.
export default express
  .Router()
  // Example A — new endpoint (add named export to controller.ts first):
  // .get('/search', authUser, validate('query', ${pascalName}SearchSchema), search)
  //
  // Example B — override a route's input schema (export updated schema from schema.js first):
  // .post('/', authUser, validate('body', ${pascalName}BodySchema), ${varName}Controller.create)
  //
  // NOTE: to override just the handler logic (not the schema), only controller.ts is needed.
  // The generated routes import from ../controller.ts so overrides are picked up automatically.
  .use('/', generatedRoutes);
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const appRoot = resolve(process.cwd(), appDir);
const schemaPath = resolve(process.cwd(), schemaFilePath);

// Load config file if present at app root
const configPath = resolve(appRoot, 'generate-crud.config.json');
let config: CrudConfig = {};
if (existsSync(configPath)) {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
}

console.log(`\nGenerating CRUD from: ${schemaFilePath}`);
console.log(`App root:             ${appRoot}`);
if (existsSync(configPath)) console.log(`Config:               ${configPath}`);
console.log();

const schemaExports = await import(pathToFileURL(schemaPath).href);

const generated: string[] = [];
const schemaOnlyGenerated: string[] = [];
const skipped: string[] = [];
const sidecarsCreated: string[] = [];

for (const [varName, exported] of Object.entries(schemaExports)) {
  if (!isPgTable(exported)) continue;
  if (tablesFilter && !tablesFilter.includes(varName)) continue;

  // Config: skip excluded tables entirely — no files generated
  if (config.exclude?.includes(varName)) {
    skipped.push(`${varName} (excluded by config)`);
    continue;
  }

  // biome-ignore lint/suspicious/noExplicitAny: drizzle table internals
  const columns = getColumns(exported as any);

  // Only generate for tables with a single-column primary key
  // biome-ignore lint/suspicious/noExplicitAny: drizzle column internals
  const pkEntry = Object.entries(columns).find(([, col]) => (col as any).primary === true);
  if (!pkEntry) {
    skipped.push(`${varName} (no single-column primary key — skipped)`);
    continue;
  }

  const [pkColName, pkCol] = pkEntry;
  // biome-ignore lint/suspicious/noExplicitAny: drizzle column internals
  const pkSqlType: string = (pkCol as any).getSQLType?.() ?? 'unknown';
  const pkBase = pkSqlType.toLowerCase().split('(')[0].split(' ')[0].trim();
  const pkIsNumeric = ['serial', 'bigserial', 'integer', 'int', 'int2', 'int4', 'int8', 'bigint'].includes(pkBase);

  // Per-table config
  const tableConfig = config.tables?.[varName];
  const excludeFromBodySet = new Set(tableConfig?.excludeFromBody ?? []);
  const excludeFromResponse = tableConfig?.excludeFromResponse ?? [];

  // All column names — used for explicit SELECT when excludeFromResponse is set
  const allColNames = Object.keys(columns);

  // Build body fields — exclude PK, server-managed SQL-expression columns, and config-excluded columns
  const bodyFields: BodyField[] = Object.entries(columns)
    // biome-ignore lint/suspicious/noExplicitAny: drizzle column internals
    .filter(([colName, col]) => !(col as any).primary && !excludeFromBodySet.has(colName))
    .filter(([, col]) => {
      // biome-ignore lint/suspicious/noExplicitAny: drizzle column internals
      const c = col as any;
      // SQL expression defaults (e.g. sql`now()`, sql`session_user`, sql`inet_client_addr()`) are
      // server-managed — exclude them from body schemas so clients cannot supply them.
      const defaultVal = c.config?.default;
      const isSqlExpression = defaultVal !== undefined && typeof defaultVal?.getSQL === 'function';
      return !isSqlExpression;
    })
    .map(([colName, col]) => {
      // biome-ignore lint/suspicious/noExplicitAny: drizzle column internals
      const c = col as any;
      const sqlType: string = c.getSQLType?.() ?? 'unknown';
      const notNull: boolean = c.notNull ?? false;
      const hasDefault: boolean = c.hasDefault ?? false;
      return {
        name: colName,
        zodCode: sqlTypeToZodCode(sqlType),
        required: notNull && !hasDefault,
      };
    });

  // Build response fields — ALL columns minus excludeFromResponse, used for ResponseSchema and OpenAPI
  const responseFields: ResponseField[] = Object.entries(columns)
    .filter(([colName]) => !excludeFromResponse.includes(colName))
    .map(([colName, col]) => {
      // biome-ignore lint/suspicious/noExplicitAny: drizzle column internals
      const c = col as any;
      const sqlType: string = c.getSQLType?.() ?? 'unknown';
      const notNull: boolean = c.notNull ?? false;
      return {
        name: colName,
        zodCode: sqlTypeToZodCode(sqlType),
        nullable: !notNull,
      };
    });

  const kebabName = toKebabCase(varName);
  const pascalName = toPascalCase(varName);
  const info: TableInfo = {
    varName,
    pascalName,
    kebabName,
    pkColName,
    pkIsNumeric,
    bodyFields,
    responseFields,
    allColNames,
    excludeFromResponse,
  };

  const tableDir = resolve(appRoot, 'src', kebabName);
  const tableGenDir = resolve(tableDir, 'generated');

  // ── Always generate the Zod schema file ───────────────────────────────────
  writeFile(resolve(tableGenDir, 'schema.js'), generateSchemaFile(info));

  // Config: schemaOnly — skip routes, controllers, and sidecars
  if (config.schemaOnly?.includes(varName)) {
    schemaOnlyGenerated.push(varName);
    continue;
  }

  // ── Generated route + controller files — always overwrite ─────────────────
  writeFile(resolve(tableGenDir, 'routes.ts'), generateRouteFile(info));
  writeFile(resolve(tableGenDir, 'controller.ts'), generateControllerFile(info));

  // ── Sidecar files — create once, then developer owns them ─────────────────
  const sidecarSchemaPath = resolve(tableDir, 'schema.js');
  const sidecarControllerPath = resolve(tableDir, 'controller.ts');
  const sidecarRoutesPath = resolve(tableDir, 'routes.ts');

  const schemaNew = writeIfAbsent(sidecarSchemaPath, generateSidecarSchema(info));
  const controllerNew = writeIfAbsent(sidecarControllerPath, generateSidecarController(info));
  const routesNew = writeIfAbsent(sidecarRoutesPath, generateSidecarRoutes(info));

  if (schemaNew || controllerNew || routesNew) sidecarsCreated.push(varName);

  generated.push(varName);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

if (generated.length === 0 && schemaOnlyGenerated.length === 0 && skipped.length === 0) {
  console.log('No pgTable exports found in the schema file.');
  process.exit(0);
}

console.log(`Generated (${generated.length}):`);
for (const name of generated) {
  const kebab = toKebabCase(name);
  const tCfg = config.tables?.[name];
  const bodyNote = tCfg?.excludeFromBody?.length ? ` [body: -${tCfg.excludeFromBody.length} fields]` : '';
  const responseNote = tCfg?.excludeFromResponse?.length
    ? ` [response: -${tCfg.excludeFromResponse.length} fields]`
    : '';
  console.log(`  ${name}${bodyNote}${responseNote}`);
  console.log(`    src/${kebab}/generated/schema.js      (overwritten)`);
  console.log(`    src/${kebab}/generated/routes.ts      (overwritten)`);
  console.log(`    src/${kebab}/generated/controller.ts  (overwritten)`);
}

if (schemaOnlyGenerated.length) {
  console.log(`\nSchema only (${schemaOnlyGenerated.length}) — Zod schema generated, no routes/controllers:`);
  for (const name of schemaOnlyGenerated) {
    const kebab = toKebabCase(name);
    console.log(`  ${name}`);
    console.log(`    src/${kebab}/generated/schema.js    (overwritten)`);
  }
}

if (skipped.length) {
  console.log(`\nSkipped (${skipped.length}):`);
  for (const s of skipped) console.log(`  ${s}`);
}

if (sidecarsCreated.length) {
  console.log(`\nSidecars created (once — yours to edit):`);
  for (const name of sidecarsCreated) {
    const kebab = toKebabCase(name);
    console.log(`  src/${kebab}/schema.js`);
    console.log(`  src/${kebab}/controller.ts`);
    console.log(`  src/${kebab}/routes.ts`);
  }
}

if (generated.length) {
  const prefix = routePrefix ? `${routePrefix}` : '';
  console.log(`\nNext step — mount routes in src/router.ts:`);
  for (const name of generated) {
    const kebab = toKebabCase(name);
    console.log(`  import ${name}Route from './${kebab}/routes.ts';`);
    console.log(`  router.use('/${kebab}', ${name}Route); // ${prefix}/${kebab}`);
  }
}

console.log();
