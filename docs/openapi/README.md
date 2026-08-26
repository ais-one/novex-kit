# OpenAPI Docs

Generated OpenAPI YAML output is stored in this folder — **one file per app** (`<app-name>.yaml`, matching the app's folder under `apps/`). This is a static, secondary artifact (for `redocly lint`, sharing the spec file, or a static HTML build) — not what a docs viewer hits day-to-day.

**To actually view an app's docs**, run that app and open its own `/docs` route (e.g. `vision-rest-audit` → `http://localhost:3300/docs`) — each REST app mounts its own live OpenAPI reference UI directly, reading straight from its own `src/openapi.ts`. See `.claude/skills/openapi-docs/SKILL.md`.

Nothing here is hand-edited. Each file is generated from that app's own `src/openapi.ts` (zod DTOs annotated with `.meta({ id })`, run through `zod-openapi`'s `createDocument()`) — regenerate rather than editing the YAML directly.

```bash
npm run docs:generate:api --workspace=scripts/generators  # regenerate docs/openapi/*.yaml from every onboarded app's src/openapi.ts
npm run docs:validate                                     # redocly lint docs/openapi/*.yaml
npm run docs:make-html                                    # optional static HTML build via Redocly
```