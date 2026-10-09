# OpenAPI Docs

Generated OpenAPI YAML output is stored in this folder — **one file per app** (`<app-name>.yaml`, matching the app's folder under `apps/`). See `.claude/skills/openapi-docs/SKILL.md` for the full convention.

Nothing here is hand-edited. Each file is generated from that app's own `src/openapi.ts` (zod DTOs annotated with `.meta({ id })`, run through `zod-openapi`'s `createDocument()`) — regenerate rather than editing the YAML directly.

**No live docs UI is mounted** — no app serves `/docs`. The YAML is the deliverable: open it in any OpenAPI viewer, or build static HTML with Redocly.

```bash
npm run docs:generate:api --workspace=scripts/generators  # regenerate docs/openapi/*.yaml from every onboarded app's src/openapi.ts
npx redocly lint docs/openapi/*.yaml                      # validate (no root docs:validate script)
npx redocly build-docs docs/openapi/<app>.yaml            # optional static HTML
```

> **Not working yet:** `sample-rest-app-v2` is listed in `scripts/generators/api-generator-route.ts` but has no `src/openapi.ts`, so `docs:generate:api` currently fails on import.
