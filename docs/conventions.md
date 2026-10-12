# Engineering Standards

This document defines repository-wide coding and runtime standards that apply across the monorepo.

## Required Tooling

- [.editorconfig](../.editorconfig) is the baseline for whitespace and formatting behavior and must be followed.
- `biome` is the required formatter and linter for this repository
- Customize own configuration file in your `apps/*` workspace

## Work Tracking Standard

- Use `TODO` to mark intentionally incomplete work, planned work, or follow-up items.

## Commit Message Standard

- Must use [czg](https://cz-git.qbb.sh/cli/) when generating commit messages.
- Refer to [git.md - Commit Message](git.md#commit-message) for details.

## JS Language Standard

- Use only ES Modules - JS Standards compliant, no CommonJS
- NodeJS applications or applications requiring compilation like Vue / React may use Native NodeJS **Typescript** (recommended) or **Javascript**
  - Exception: new backend apps using the controller → service → repository layering must be **Typescript with `strict: true`** (see [CLAUDE.md](../CLAUDE.md#clean-architecture-controller--service--repository) and the `clean-architecture` skill)
  - NodeJS TS (runtime) + `tsc --noEmit` (static type check) + `zod` (dynamic validation)  
  - `common/compiled/node` uses Typescript (`common/compiled/vue` is still Javascript)
- Browser and Isomorphic code must use Javascript only
- Named exports preferred (use export default only for a single class, config, or plugin)
- do not use named exports and export default in same file
- do not create barrel files (modules that only re-export other modules, e.g. `export * from`) — an `index.ts` with its own logic, like `common/compiled/node/services/index.ts`, is not a barrel
- Prefer native platform features — test runner, datetime, fetch, npm, git hooks — over heavy libraries where possible
- Use `zod` for all input validation and OpenAPI schema generation
- When globals are needed, namespace them under one object and key them with a `Symbol`:
  ```js
  globalThis.__myApp = globalThis.__myApp || {}
  const _key = Symbol('key')
  globalThis.__myApp[_key] = value
  ```

### Typing Convention

- In `.ts` files: use TypeScript type annotations — do **not** use JSDoc for types
  - used mainly in `apps/*` (with ts), `common/compiled/node` and `scripts/*`
- In `.js` files: use JSDoc (`/** @type */`, `/** @param */`, etc.) for type hints and IDE autocomplete
  - used mainly in `apps/*` (with js) and `common/vanilla/*`

## Node Runtime Standard

- Node runtime applications must import `@common/node/logger` and use the global `logger` instead of `console.*`.
- Node runtime applications must import `@common/node/config` for application config loading.
- `.env.json` for non-sensitive structured values, exposed globally through `globalThis.__config`. `//` line comments are allowed.
- `.env` for secrets and simple scalar values, loaded into `process.env` in development only (`.env.local` first, then `.env`). In production, inject secrets via your deployment platform (K8s secrets, Docker env, vault agent sidecar, CI/CD injection) — `.env` files are not loaded outside development.

## Configuration And Secrets Standard

- Secrets must not be committed to the repository.
- Secrets must be stored in environment variables or a secret manager.
- JSON config files must be used only for non-sensitive structured settings.

### Logging Restrictions

- use `@common/node/logger` for node runtime applications in the folders below
  - common/compiled/node
  - scripts/* - long-running services/servers only; one-shot CLI tooling (generators, `test-schemas.ts`, `serve-db.ts` startup output, `kafka-*.ts`) may use `console.*`
  - apps/* - if node runtime
- strip `console.*` for browser runtime applications in the folders below (in production) — errors go to Sentry instead
  - common/compiled/vue - frontend VueJS
  - common/vanilla/web - frontend plainJS
  - common/vanilla/iso - simple files used in both browser and node runtimes
  - apps/* - if browser runtime

