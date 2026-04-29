// Config loading strategy:
//   development — loads .env.local then .env from cwd (file-based secrets are acceptable locally)
//   production  — .env files are NOT loaded; secrets must be injected into process.env before
//                 app start by the deployment platform (K8s secrets, Docker env, vault agent
//                 sidecar, CI/CD secret injection, etc.). Do not rely on .env files in production.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(process.cwd(), '.env');

if (process.env.NODE_ENV === 'development') {
  try {
    loadEnvFile(`${envFilePath}.local`);
  } catch {}
  try {
    loadEnvFile(envFilePath);
  } catch {}
}

function updateStringState(char: string, isEscaped: boolean): { isEscaped: boolean; inString: boolean } {
  if (isEscaped) return { isEscaped: false, inString: true };
  if (char === '\\') return { isEscaped: true, inString: true };
  if (char === '"') return { isEscaped: false, inString: false };
  return { isEscaped: false, inString: true };
}

function skipLineComment(source: string, index: number): { index: number; newline: boolean } {
  while (index < source.length && source[index] !== '\n') index += 1;
  return { index, newline: index < source.length };
}

/** Strip `//` line comments from a JSONC string, preserving strings and newlines. */
const normalizeJsonc = (source: string): string => {
  let result = '';
  let inString = false;
  let isEscaped = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (inString) {
      result += char;
      ({ isEscaped, inString } = updateStringState(char, isEscaped));
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      index += 1;
      continue;
    }

    if (char === '/' && source[index + 1] === '/') {
      const skip = skipLineComment(source, index);
      index = skip.index;
      if (skip.newline) result += '\n';
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
};

/** Parse a JSONC string into a plain config object. Throws if the result is not an object. */
const parseJsoncObject = (raw: string, filePath: string): Record<string, unknown> => {
  const normalized = normalizeJsonc(raw).trim();
  if (!normalized) return {};

  const config: unknown = JSON.parse(normalized);
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError(`JSON config must be a top-level object: ${filePath}`);
  }
  return config as Record<string, unknown>;
};

/** Read and parse a `.env.json` / `.env.jsonc` file. Returns `{}` if the file does not exist. */
const loadJsonConfigFile = (filePath: string): Record<string, unknown> => {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return {};

  return parseJsoncObject(raw, filePath);
};

const __config = Object.freeze(loadJsonConfigFile(`${envFilePath}.json`));
globalThis.__config = __config;

export { __config };
