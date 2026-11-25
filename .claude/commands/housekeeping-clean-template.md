---

description: Housekeeping for the framework — everything except apps/ and db/. Simplify, then tests, then docs, with a stop on any failure.
argument-hint: "[path] (optional, a sub-path outside apps/ and db/; defaults to the repo root)"
---

# Housekeeping — framework

The counterpart for `apps/` and `db/` is `/housekeeping-clean-apps`.

## Scope

- **Include:** `$ARGUMENTS` if given, otherwise the repository root. In practice that means `common/**`, `scripts/**`, `.githooks/**`, scripts under `.github/actions/**`, root config, `docs/**` and `.claude/CLAUDE.md`.
- **Always exclude:** `apps/` and `db/`, which have their own command, `/housekeeping-clean-apps`.
- **Also exclude:**
  - Generated and vendored code: `node_modules/`, `dist/`, `build/`, `coverage/`, `common/schemas/docs/openapi/`.
  - Lockfiles, `.env*` files, and anything listed in `.gitignore`.
  - `.claude/skills/**`, `.claude/commands/**` and `.claude/agents/**`. Those are instructions for Claude, and editing them changes behaviour.

If `$ARGUMENTS` points inside `apps/` or `db/`, **stop** and tell me to use `/housekeeping-clean-apps` instead.

**Public API:** downstream repos import the `common/*` packages, so an export with no caller in this repo may still be used elsewhere. Never remove an export from `common/*` or change its signature. List it as a deprecation candidate under "Suggested follow-ups".

## Hard rule: evidence, not guesses

Every finding must be backed by something read or run **during this run**: tool output, a file and line, or a grep that shows the call sites. Don't report "probably unused" or "likely slow" without that evidence. If a tool fails, report the failure for that step. Don't fall back to assumed results. Don't add new tools or dependencies (no `knip`, `depcheck`, `ts-prune` and so on) to find issues.

## Pre-flight

1. **Template or downstream?** Compare `git remote get-url origin` with `UPSTREAM_URL` in `.github/workflows/update-template.yml`. In a downstream repo, everything in this scope is overwritten on the next sync (`docs/github.md#sync-upstream-template`). Tell me that, and offer a report-only run with no branch, edits or commits, so the findings can be raised upstream. Continue only if I choose that.
2. Run `git status`. If the working tree is dirty, **stop** and ask whether to commit, stash, or abort.
3. If the current branch is `main` or `rel/*`, stop. Working branches start from the right `rel/x.y` (`docs/git.md#branching-and-workflow`). Otherwise create `chore/housekeeping-template-<YYYY-MM-DD>` (append `-2`, `-3`... if it exists).
4. Record the baseline. If any tests fail or `tsc` reports errors here, stop and report them before housekeeping starts.
   - **Tests and coverage:** the **full** test suite, not just framework tests, because apps depend on the framework: `npm run test:workspaces`, keeping per-file coverage.
   - **Types:** `npx tsc --noEmit -p <dir>` for **every** project with a `tsconfig.json` (`common`, `scripts`, `db` and each `apps/*` app).
   - **Biome:** `npx biome check <scope> --max-diagnostics=none`, with no `--write`.
   - **Duplication:** `npm run ci:dup:root`.

## How each step runs

1. Review the step's area of the scope and collect findings with their evidence.
2. Present them as one table ranked by impact: id, file:line, problem, evidence, proposed fix, risk (low, or medium for behaviour-adjacent changes).
3. Ask which to apply: all, some by id, or none. If none, skip to the next step without committing.
4. Apply the chosen findings without asking again. Behaviour and public APIs must stay the same, with no new dependencies.
5. Run the scope check, then the step's checks, then commit.

**Scope check:** run `git diff --name-only` for the step's changes. If any changed file is under `apps/`, `db/`, or another excluded path, revert those files, then continue only if the remaining changes still pass. Mention the reverted files in the summary.

**Commit scope:** use the workspace when only one is changed (e.g. `common/compiled/node`), and `repo` when the changes cut across workspaces, per `docs/git.md#commit-message`.

## Step 1 — Simplify

Don't call the built-in `/simplify` here: it only reviews the current diff, which is empty after pre-flight. Review the scope's source directly with the same lens:

- **Duplication:** the jscpd hits plus near-duplicates jscpd misses. Propose one shared helper in the package where it belongs.
- **Dead code:** unexported helpers nobody calls, unused internal files, unreachable branches, commented-out blocks, stale `TODO`s whose work is already done. Prove each one is unused by searching the **whole repo**, including `apps/**` and `db/**`. Exported `common/*` APIs are follow-ups, not removals (see Public API).
- **Efficiency:** repeated work in loops, sequential `await`s that could run in parallel with `Promise.all`, repeated parsing or regex compilation in hot paths, N+1 calls to a DB or the network, reading whole files or results where streaming or paging fits, and per-request work in the shared Express middleware that could happen once at startup.
- **Simplification:** needless wrappers and indirection, convoluted conditionals, and hand-written code that a native platform feature replaces (`fetch`, `node:test`, `structuredClone`, `Intl`, `AbortSignal.timeout` and so on).
- **Convention drift** (`docs/conventions.md`): `console.*` where the logger is required, barrel files, files mixing named and default exports, CommonJS, JSDoc types in `.ts` files.

Leave out style that Biome already enforces, and anything that is a matter of taste.

Checks: the full test suite and `tsc` for every project, plus Biome on the changed files. Stop on failure.
Commit: `chore(<scope>): housekeeping simplify`.

## Step 2 — Tests

Test files within the scope only. **Production code stays frozen.** Look for:

- `mock.module()` paths that include `.ts`.
- Setup duplicated across test files that `@common/node/utils-tests/http-mocks` or `http-request` already provides.
- Tests that can never fail, or that only check a mock returned what it was told to return.
- Tests tied to internals that should check behaviour instead.
- Exported `common/*` modules with no tests at all: list them under "Suggested follow-ups" rather than writing new suites here.

Checks: the full test suite and `tsc`, and confirm that per-file coverage did not drop. Stop on failure or a coverage drop.
Commit: `chore(<scope>): housekeeping tests`.

## Step 3 — Docs

Markdown within the scope only (`docs/**`, `.claude/CLAUDE.md`, READMEs outside `apps/` and `db/`). **Source stays frozen.** Look for:

- Paths, npm scripts, commands, env vars, versions and workflow names that no longer match the code, `package.json` or `.github/`. Check each one against the source.
- Facts repeated outside their single source of truth (the files `.claude/CLAUDE.md` marks as "the single source of truth"). Replace the copy with a link, and fix the source if the copies disagree.
- Broken relative links and anchors.

Checks: tests (in case docs are tested). Stop on failure.
Commit: `chore(docs): housekeeping docs`.

## On failure

Stop immediately and don't continue to later steps. Don't fix forward by editing unrelated code. Leave the failing step's changes uncommitted, and report which step failed, the errors, and the files touched.

## Out of scope

No architecture or cross-package refactors. If you see issues that need one, list them under "Suggested follow-ups".

## Summary

- Branch and commits (or "report-only" for a downstream run)
- Per step: findings applied, skipped or reverted, files changed, and any files reverted by the scope check
- Before and after: coverage, Biome diagnostics, jscpd duplication
- Suggested follow-ups: `common/*` export deprecation candidates, cross-package refactors, untested modules

Do not push or open a PR unless I ask.
