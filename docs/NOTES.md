## Description

This document is for `design preferences`, `open questions`, `caveats`, `migration notes`, `ideas that are not yet stable policy`

## Design Features

- Typescript preferences (on top of [conventions.md](conventions.md))
  - avoid enums, instead... use const object pattern / string literal unions
  - avoid legacy decorators
  - avoid using <any>, use <unknown>
- npm workspaces naming (microservices & shared libraries) — see the repository structure in [CLAUDE.md](../CLAUDE.md#repository-structure)
  - apps : microservices or applications (frontend or backend)
    - <tenant1>-common
    - <tenant1>-<app1>
    - <tenant1>-<app2>
    ...
    - <tenantN>-common
    - <tenantN>-<app1>
    - <tenantN>-<app2>
    - default port 3000
- automation
  - code review AI - TODO
  - api documentation
  - unit and integration test generation
- biome chosen over prettier+eslint
- Support
  - postgres as primary RDBMS, mysql as secondary.
  - redis or keyv
- DB audit logging [strategy](design/pg-audit-implementation.md)
- Authorization [strategy](design/authz.md)
  - RBAC, FGA, and legacy roles fallback
  - multi-tenant, scopes

## Roadmap

- **IN PROGRESS**
  - fix typescript noExplicit any
  - Clean up auth and documentations
- **TO TEST** 
  - add RBAC and FGA
  - Typescript to zod, convert code to TS for node runtime...
  - audit_logs
- **BACKLOG**
  - re-enable E2E tests — uncomment the `e2e-tests` job in `.github/workflows/ci-tests.yml` and add a `test:e2e` step to `.githooks/pre-push` (both marked `TODO`); needs servers/ports handled in CI (e.g. `sample-api` / `sample-common` start on 8080)
- **REVIEW**
  - visualize package sizes with rollup-plugin-visualizer
  - revisit biome when vueJS support is available
  - revisit biome when it is able to lint YAML
  - S3/OSS

### To Consider

1. Use [testcontainers](https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/)

- Runs many services for test purposes
- Data is not persisted

2. linting auto fix

```bash
# safe - useArrowFunction, useConst
# unsafe - useTemplate, useNodejsImportProtocol, useOptionalChain,  
npx biome <format/lint/check> common apps scripts
npx biome lint common apps scripts --only=useTemplate --write --unsafe
```

3. Explicitly implementing csurf protection

See [js/missing-token-validation](../.github/codeql/codeql-config.yml) in CodeQL config.
