## Description

This document is for
- design preferences
- open questions
- caveats
- migration notes
- ideas that are not yet stable policy

## Design Features

- Fully ES Modules - JS Standards Compliant
- Named exports preferred (default exports for class, config, or a plugin)
- Use Native as much as viable (test runners, datetime, fetch / xhr, npm, git hooks)
- Option to use Javascript or Typescript for backend.
- For Typescript
  - avoid compilation, Use NodeJS native typescript
  - use `tsc --noEmit` for type checking and `zod` for runtime validation
  - avoid enums, instead... use const object pattern / string literal unions
  - avoid legacy decorators
  - avoid using <any>, use <unknown>
- npm workspaces (microservices & shared libraries)
  - apps : microservices or applications (frontend or backend)
    - shared-<tenant1>
    - <tenant1>-<app1>
    - <tenant1>-<app2>
    ...
    - shared-<tenantN>
    - <tenantN>-<app1>
    - <tenantN>-<app2>
    - default port 3000
  - common/shared code and schemas
  - sripts
- use zod for validation and openapi generation...
- automation
  - commit messages - czg
  - changelog - git-cliff (release notes on the GitHub release)
  - release - manual Release workflow (release.yml)
  - code review AI - TODO
  - api documentation
  - unit and integration test generation
- global logger
  - no console log for backend
  - no logs in frontend production, errors sent to Sentry
- use biome for formatting and linting
  - biome vs prettier+eslint
- testing
  - use native node test runner
  - playwright for e2e testing
- Support
  - postgres as primary RDBMS, mysql as secondary.
  - redis or keyv
- DB audit logging [strategy](design/pg-audit-implementation.md)
- Authorization [strategy](design/authz.md)
  - RBAC, FGA, and legacy roles fallback
  - multi-tenant, scopes
- jsdoc for typing and autocomplete on IDE ?

## Roadmap

- **IN PROGRESS**
  - JSON in env, refactor to use something else
  - fix typescript noExplicit any
  - Clean up auth and documentations
- **TO TEST** 
  - add RBAC and FGA
  - Typescript to zod, convert code to TS for node runtime...
  - audit_logs
- **BACKLOG**
  - safeJSON
  - remove barrel index.js files...
- **REVIEW**
  - visualize package sizes with rollup-plugin-visualizer
  - revisit biome when vueJS support is available
  - S3/OSS

### To Consider

1. Use namespace, Symbol with globalThis

```js
# Check if namespace exists, if not create it.
globalThis.__myApp = globalThis.__myApp || {};
# Define a unique symbol under a namespace
const _logger = Symbol('logger');
# Attach logger to global namespace using symbol as key
globalThis.__myApp[_logger] = myLogger;
```

2. Use [testcontainers](https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/)

- Runs many services for test purposes
- Data is not persisted

3. linting auto fix

```bash
# safe - useArrowFunction, useConst
# unsafe - useTemplate, useNodejsImportProtocol, useOptionalChain,  
npx biome <format/lint/check> common apps scripts
npx biome lint common apps scripts --only=useTemplate --write --unsafe
```

---

<!--
on:
  push:
    branches: [TODO]
    paths:
      - 'services/auth-service/**'
      - 'shared/**'
      - '.github/workflows/deploy-auth-service.yml'
-->
