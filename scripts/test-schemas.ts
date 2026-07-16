import { readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCHEMA_FILE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts']);

function collectSchemaFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && SCHEMA_FILE_EXTENSIONS.has(extname(entry.name)))
    .map(entry => resolve(entry.parentPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function isSchemaLike(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).parse === 'function' &&
      typeof (value as Record<string, unknown>).safeParse === 'function',
  );
}

const inputDir = process.argv[2];

if (!inputDir) {
  console.error('Usage: node scripts/test-schemas.ts <schema-directory>');
  process.exit(1);
}

const schemaDir = resolve(process.cwd(), inputDir);

try {
  if (!statSync(schemaDir).isDirectory()) {
    console.error(`Schema path is not a directory: ${inputDir}`);
    process.exit(1);
  }
} catch {
  console.error(`Schema directory not found: ${inputDir}`);
  process.exit(1);
}

const schemaFiles = collectSchemaFiles(schemaDir);

if (schemaFiles.length === 0) {
  console.log(`No schema files found in ${inputDir}; skipping.`);
  process.exit(0);
}

let hadFailure = false;

for (const filePath of schemaFiles) {
  const moduleExports = await import(pathToFileURL(filePath).href);
  const schemaExportNames = Object.entries(moduleExports as Record<string, unknown>)
    .filter(([, value]: [string, unknown]) => isSchemaLike(value))
    .map(([name]) => name);

  if (schemaExportNames.length === 0) {
    console.error(`No Zod schema exports found in ${filePath}`);
    hadFailure = true;
    continue;
  }

  console.log(`Validated ${filePath}: ${schemaExportNames.join(', ')}`);
}

if (hadFailure) {
  process.exit(1);
}

console.log(`Schema validation passed for ${inputDir}`);
