## Description

This document is for `design preferences`, `open questions`, `caveats`, `migration notes`, `ideas that are not yet stable policy`

## Design Features

- Typescript preferences (on top of [conventions.md](conventions.md))
  - avoid enums, instead... use const object pattern / string literal unions
  - avoid legacy decorators
  - avoid using <any>, use <unknown>
- npm workspaces naming (microservices & shared libraries) — see the repository structure in [CLAUDE.md](../.claude/CLAUDE.md#repository-structure)
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
  - E2E tests — planned in [TEST_STRATEGY.md](TEST_STRATEGY.md) [§12 step 8](TEST_STRATEGY.md#12-implementation-checklist-in-order) (Playwright against staging after `deploy-sae.yml`), which replaces the commented-out `e2e` step in `.github/workflows/ci-tests.yml`
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
