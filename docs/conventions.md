# Engineering Standards

This document defines repository-wide coding and runtime standards that apply across the monorepo.

Read this document before making code changes. Use [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) for contributor workflow, issue reporting, and pull request rules.

## Required Tooling

- [.editorconfig](../.editorconfig) is the baseline for whitespace and formatting behavior and must be followed.
- `biome` is the required formatter and linter for this repository
- Customize own configuration file in your `apps/*` workspace

## Work Tracking Standard

- Use `TODO` to mark intentionally incomplete work, planned work, or follow-up items.

## Commit Message Standard

- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).
- Only `feat`, `fix`, and `chore` may be used as the top-level commit types.
- Use `chore` for `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, and `revert` style changes.
- Commit messages must use the format `type(scope): short description`.
- Breaking changes must add `!` before `:`.
- Use [czg](https://cz-git.qbb.sh/cli/) when generating commit messages.

## Language Standard

- Use of ES Modules is mandated.
- NodeJS applications or applications requiring compilation like Vue / React may use Native NodeJS **Typescript** (recommended) or **Javascript**
  - Exception: new backend apps using the controller → service → repository layering must be **Typescript with `strict: true`** (see [CLAUDE.md](../CLAUDE.md#clean-architecture-controller--service--repository) and the `clean-architecture` skill)
  - NodeJS TS (runtime) + `tsc --noEmit` (static type check) + `zod` (dynamic validation)  
  - `common/compiled/node` uses Typescript (`common/compiled/vue` is still Javascript)
- Browser and Isomorphic code must use Javascript only

### Typing Convention

- In `.ts` files: use TypeScript type annotations — do **not** use JSDoc for types
- In `.js` files: use JSDoc (`/** @type */`, `/** @param */`, etc.) for type hints and IDE autocomplete

## Node Runtime Standard

- Node runtime applications must import `@common/node/logger` and use the global `logger` instead of `console.*`.
- Node runtime applications must import `@common/node/config` for application config loading.
- `.env.json` for non-sensitive structured values, exposed globally through `globalThis.__config`. `//` line comments are allowed.
- `.env` for secrets and simple scalar values, loaded into `process.env` in development only. In production, inject secrets via your deployment platform (K8s secrets, Docker env, vault agent sidecar, CI/CD injection) — `.env` files are not loaded outside development.

## Configuration And Secrets Standard

- Secrets must not be committed to the repository.
- Secrets must be stored in environment variables or a secret manager.
- JSON config files must be used only for non-sensitive structured settings.

### Logging Restrictions

- use `@common/node/logger` for node runtime applications in the folders below
  - common/compiled/node
  - scripts/* - long-running services/servers only; one-shot CLI tooling (generators, `test-schemas.ts`, `serve-db.ts` startup output, `kafka-*.ts`) may use `console.*`
  - apps/* - if node runtime
- strip `console.*` for browser runtime applications in the folders below (in production)
  - common/compiled/vue - frontend VueJS
  - common/vanilla/web - frontend plainJS
  - common/vanilla/iso - simple files used in both browser and node runtimes
  - apps/* - if browser runtime

## OTHER IMPORTANT CAVEATS!

- use named exports; use export default only for a single class, config, or plugin
- do not create barrel index.js files
- do not use named exports and export default in same file