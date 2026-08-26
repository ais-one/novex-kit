#!/usr/bin/env node
// scripts/generate-openapi.ts
//
// Generates one docs/openapi/<app>.yaml per onboarded REST app, for offline/CI use (redocly
// lint, sharing the spec file, static HTML builds). Each app owns its own OpenAPI document in
// <app>/src/openapi.ts (built with zod-openapi's createDocument() from that app's own zod
// DTOs) — this script only loops over the onboarded apps and writes their static output.
//
// The live, primary way to view an app's docs is that same app mounting them itself (e.g.
// vision-rest-audit's src/index.ts mounts @scalar/express-api-reference at /docs, reading
// document straight from src/openapi.ts) — this script's output is a secondary artifact, not
// what a docs viewer hits. See .claude/skills/openapi-docs/SKILL.md for the full convention.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// Add an app's name here once it has its own src/openapi.ts — see the skill's
// "Applying this to the apps in this repo today" section for the onboarding steps.
const APPS = ['sample-rest-app-v2'];

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'docs', 'openapi');

mkdirSync(OUT_DIR, { recursive: true });

for (const app of APPS) {
  const { document } = await import(`../apps/${app}/src/openapi.ts`);
  const file = `${app}.yaml`;
  writeFileSync(resolve(OUT_DIR, file), yaml.dump(document, { lineWidth: 120 }));
  console.log(`✅ ${document.info.title} -> docs/openapi/${file} (${Object.keys(document.paths ?? {}).length} paths)`);
}
