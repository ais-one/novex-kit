import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

function listDirs(parent) {
  try {
    return readdirSync(join(root, parent))
      .filter(name => statSync(join(root, parent, name)).isDirectory())
      .map(name => `${parent}/${name}`);
  } catch {
    return [];
  }
}

const workspaceScopes = [...listDirs('apps'), 'db', 'common', 'scripts', 'docs', 'ci', 'repo'];

/** @type {import('czg').UserConfig} */
export default {
  types: [
    { value: 'feat', name: 'feat:     A user-visible feature' },
    { value: 'fix', name: 'fix:      A user-visible bug fix' },
    { value: 'chore', name: 'chore:    Docs, CI, test, refactor, or maintenance work' },
  ],
  defaultType: 'feat',
  scopes: ['NA', ...workspaceScopes],
};
