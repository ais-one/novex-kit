---

description: Housekeeping for apps/ and db/ only. Simplify, then tests, then docs, with a stop on any failure.
argument-hint: "[apps | db | path] (optional, defaults to both apps/ and db/)"
---

# Housekeeping — apps and db

The counterpart for everything outside `apps/` and `db/` is `/housekeeping-clean-template`.

## Scope

Resolve `$ARGUMENTS`:

- empty → `apps/` and `db/`
- `apps` → `apps/` only
- `db` → `db/` only
- a path or name → that path, which **must** be inside `apps/` or `db/` (e.g. `base-iam`, `apps/cron/src`, `db/iam`). If it isn't, **stop** and tell me to use `/housekeeping-clean-template` instead.

**Never modify anything outside `apps/` and `db/`**, including the template code an app imports (`common/**`, `scripts/**`). That code is overwritten on every upstream sync (`docs/github.md#sync-upstream-template`). If a cleanup would need a change there, list it under "Suggested follow-ups" instead.

**Also exclude:**

- Generated and vendored code: `node_modules/`, `dist/`, `build/`, `coverage/`, `apps/*/public/`, `apps/*/docs/openapi/`, `db/*/openapi/`, `db/dev.db/`.
- `db/*/crud/*/generated/`, which `crud:generate` overwrites. Clean up the sidecar files next to it instead.
- Lockfiles, `.env*` files, anything in `.gitignore`, and `apps/.claude/**`.

**`sample-*` apps** are templates that get copied to start new apps. Clean them up, but keep their example code, comments and illustrative patterns, even when nothing calls them.

### db/ protections

- **Never modify migrations** (`db/*/drizzle/**`). Migrations that may already have been applied are immutable, and changing them causes drift between environments.
- Don't change schema definitions (`schema.ts`), seed data values, or anything else that changes what the database contains or how it is structured. Cleanup in `db/` is limited to readability (local names, comments, dead helper code), the sidecar CRUD files (as long as the HTTP behaviour stays the same), and their tests and docs.
- If you find a real schema or migration problem, report it under "Suggested follow-ups" and don't fix it here.

## Hard rule: evidence, not guesses

Every finding must be backed by something read or run **during this run**: tool output, a file and line, or a grep that shows the call sites. Don't report "probably unused" or "likely slow" without that evidence. If a tool fails, report the failure for that step. Don't fall back to assumed results. Don't add new tools or dependencies (no `knip`, `depcheck`, `ts-prune` and so on) to find issues.

## Pre-flight

1. Run `git status`. If the working tree is dirty, **stop** and ask whether to commit, stash, or abort.
2. If the current branch is `main` or `rel/*`, stop. Working branches start from the right `rel/x.y` (`docs/git.md#branching-and-workflow`). Otherwise create `chore/housekeeping-apps-<YYYY-MM-DD>` (append `-2`, `-3`... if it exists).
3. Record the baseline for the scope. If any tests fail or `tsc` reports errors here, stop and report them before housekeeping starts.
   - **Tests and coverage:** `npm run test --if-present -w <workspace>` for each workspace in scope, keeping the per-file coverage from the unit tests.
   - **Types:** `npx tsc --noEmit -p <dir>` for each app in scope that has a `tsconfig.json`, and for `db`.
   - **Biome:** `npx biome check <scope> --max-diagnostics=none`, with no `--write`.
   - **Duplication:** `npm run ci:dup:apps` and/or `npm run ci:dup:db`.

## How each step runs

1. Review the step's area of the scope and collect findings with their evidence.
2. Present them as one table ranked by impact: id, file:line, problem, evidence, proposed fix, risk (low, or medium for behaviour-adjacent changes such as query rewrites).
3. Ask which to apply: all, some by id, or none. If none, skip to the next step without committing.
4. Apply the chosen findings without asking again. Behaviour must stay the same: same HTTP responses and status codes, and the same `{ message, data }` / `{ error }` shapes. No new dependencies.
5. Run the scope check, then the step's checks, then commit.

**Scope check:** run `git diff --name-only` for the step's changes. Revert any changed file that is outside the scope, is excluded, is a migration, or is a schema or seed. Continue only if the remaining changes still pass, and mention the reverted files in the summary.

**Commit scope:** use `apps`, `db`, or the workspace path when the run is narrowed to one workspace (e.g. `apps/base-iam`), per `docs/git.md#commit-message`.

## Step 1 — Simplify

Don't call the built-in `/simplify` here: it only reviews the current diff, which is empty after pre-flight. Review the scope's source directly with the same lens:

- **Duplication:** the jscpd hits plus near-duplicates jscpd misses.
  - When the copies are within one app, extract them within that app.
  - When the copies are across apps, extract them into the shared package under `apps/` (e.g. `@apps/sample-common`, or the downstream repo's own counterpart).
  - Never move code into `common/**`. If it really belongs there, add it to "Suggested follow-ups".
- **Dead code:** unused files, routes, controllers, services, repositories or exports, unreachable branches, commented-out blocks, stale `TODO`s whose work is already done. Prove each one is unused by searching the whole repo. A route counts as used if it is mounted in a router.
- **Efficiency:**
  - Repeated work in loops, and sequential `await`s that could run in parallel with `Promise.all`.
  - N+1 queries that should be one query with a join or `IN (...)`, `SELECT *` where the columns are known, and missing paging on list endpoints.
  - Per-request work that could happen once at startup, and DB or HTTP clients created per call instead of reused.
- **Simplification:** needless wrappers and indirection, convoluted conditionals, hand-written code that a native platform feature or an existing `@common/*` helper already provides, and sidecar CRUD overrides that just repeat what `generated/` does.
- **Convention drift:** `console.*` instead of the logger, barrel files, files mixing named and default exports (`docs/conventions.md`).

Leave out style that Biome already enforces, and anything that is a matter of taste.

Checks: tests and `tsc` for the affected workspaces, plus Biome on the changed files. Stop on failure.
Commit: `chore(<scope>): housekeeping simplify`.

## Step 2 — Tests

Test files within the scope only. **Production code stays frozen.** Look for:

- Tests or suites missing `.only()` in `apps/*`. App test scripts pass `--test-only`, so those are silently skipped. When adding `.only()` makes a test fail, report it rather than fixing production code.
- A file skipped incorrectly: lifecycle hooks left outside the single outer `describe.skip` (see `.claude/CLAUDE.md#skipping-a-test-file`).
- `mock.module()` paths that include `.ts`.
- Setup duplicated across test files that `@common/node/utils-tests/http-mocks` or `http-request` already provides.
- Tests that can never fail, or that only check a mock returned what it was told to return.
- Tests tied to internals that should check behaviour instead.

Checks: tests and `tsc`, and confirm that per-file coverage did not drop. Stop on failure or a coverage drop.
Commit: `chore(<scope>): housekeeping tests`.

## Step 3 — Docs

Markdown within the scope only (e.g. `apps/*/README.md`, `db/README.md`). **Source stays frozen.** Look for:

- Paths, npm scripts, commands, env vars, ports and URLs that no longer match the code or `package.json`. Check each one against the source.
- Content that repeats a single source of truth elsewhere (e.g. `docs/install.md`, `db/README.md`). Replace it with a link.
- Broken relative links.

Docs outside the scope that are out of date (`docs/**`, `.claude/CLAUDE.md`) go under "Suggested follow-ups".

Checks: tests (in case docs are tested). Stop on failure.
Commit: `chore(<scope>): housekeeping docs`.

## On failure

Stop immediately and don't continue to later steps. Don't fix forward. Leave the failing step's changes uncommitted, and report which step failed, the errors, and the files touched.

## Out of scope

No architecture refactors. List layering, DTO or logging breaches in the clean-architecture apps (`sample-common`, `sample-queue-consumer`, `sample-rest-app-v2`, and apps built from them) under "Suggested follow-ups" for the `clean-architecture-reviewer` agent.

## Summary

- Branch and commits
- Per step: findings applied, skipped or reverted, files changed, and any files reverted by the scope check
- Before and after: coverage, Biome diagnostics, jscpd duplication
- Suggested follow-ups: changes needed in `common/`, schema or migration issues, docs outside the scope, architecture breaches

Do not push or open a PR unless I ask.
