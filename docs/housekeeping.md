# Housekeeping

This document covers how dependencies and GitHub Actions are kept up to date in this repo: what's automated, what's on-demand, and the conventions both follow.

## Automated: Dependabot

`.github/dependabot.yml` runs two weekly update checks:

| Ecosystem        | Scope                                                                                                                          | Interval |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `npm`            | root (`/`) — the root lockfile covers every workspace (`apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`) | weekly   |
| `github-actions` | `.github/workflows/*.yml` and `.github/actions/*` composite actions                                                            | weekly   |

Dependabot opens one PR per bump. It doesn't research breaking changes, doesn't batch non-major bumps together, and doesn't enforce commit-SHA pinning on Actions — it just proposes the bump and lets CI and review catch problems.

## On-demand: Claude Code housekeeping commands

Four custom slash commands cover the gaps Dependabot leaves — interactive, researched, and batched where it's safe to do so. All four live in `.claude/commands/` and are triggered manually. Two more commands handle code cleanup — see [Code cleanup](#on-demand-code-cleanup).

### `/housekeeping-scan-actions`

Scans every `uses:` reference under `.github/workflows/*.yml` and `.github/actions/**/action.yml` (skipping local `./...` refs), lists the full inventory (official vs. third-party) before touching anything, then works through each one:

- Resolves the actual latest version and commit SHA via the GitHub API — never guessed or recalled from memory.
- Flags both outdated versions **and** actions still on a floating tag (e.g. `@v4`) instead of a commit SHA, since an unpinned tag is a supply-chain risk independent of whether the version is current.
- Proposes each change individually (file, line, old → new) and asks for approval before editing.

### `/housekeeping-update-packages`

Runs `npm outdated -ws --json` across all workspaces, splits results into a **safe** bucket (same major version) and a **breaking-review** bucket (major version bump available), then:

- Shows the full inventory before changing anything.
- Batch-confirms the safe bucket in one question, then runs a real `npm install` (not `--dry-run` — that has been observed to rewrite `package-lock.json` for real in this environment) and the test suite.
- Walks the breaking-review bucket one package at a time — checking peer-dependency deltas via `npm view`, fetching real changelogs/release notes, and where practical trial-installing to catch `ERESOLVE` conflicts — before asking whether to proceed with each one.

### `/housekeeping-check-tsconfig`

Audits every `tsconfig.json` in the repo against the TypeScript version that actually resolves for its workspace (a workspace's own `typescript` devDependency, if declared, takes precedence over the repo root's):

- Resolves the real installed `typescript` package per workspace and reads its `ScriptTarget` enum (from `lib/typescript.d.ts`) to determine the newest `target`/`lib` that compiler actually supports — never a remembered feature set, since new targets (`ES2023`, `ES2024`, `ES2025`, ...) ship across TypeScript releases.
- Follows `"extends"` chains (e.g. `db/tsconfig.json` → `tsconfig.base.json`, `apps/<app>/tsconfig.json` → `apps/tsconfig.base.json`) to compute each file's effective `target` before comparing.
- Reports two tables — a tsconfig audit (current vs. newest-supported target, in sync / behind / ahead-invalid) and a `typescript` devDependency drift list (workspaces overriding root's pinned version).
- **Read-only**: unlike the other three commands, it never edits anything or asks for approval to apply a change — it stops at the report and leaves the decision to the user.

### `/housekeeping-update-node-npm`

Resolves the current Active LTS Node.js release and its matching npm version live (via `nodejs.org`/`nodejs/Release` schedule data and the npm registry), screens both for called-out regressions or security issues in their release notes, and confirms the repo's CI (`actions/setup-node` version manifest) and workspaces (`engines` fields, installed dependencies' own `engines.node` ranges) can actually run on the candidate before proposing anything:

- Discovers every place a Node/npm version is currently pinned: root `package.json` `engines`, `.github/actions/setup-node-npm-install/action.yml` defaults, any hardcoded `node-version`/matrix overrides in workflows, example workflows under `docs/`, `.claude/CLAUDE.md`/docs prose, any `.nvmrc`, every `apps/*/Dockerfile` (`ARG NODE_VERSION` / `FROM node:…`), and any workspace-level `engines` override. Every location — build/run pins, `engines` (and their `package-lock.json` copies) and prose — is pinned to the same exact version (e.g. `24.22.1` / `11.18.0`); no ranges or major floors. Drift is not allowed: any location that isn't exact, or doesn't match the composite action's defaults, is always fixed — to the new version if the update is approved, otherwise to the current one — and the run re-checks every location at the end and fails if any drift remains.
- Reports the full inventory plus the candidate versions and why they were chosen (e.g. stepping back from the single newest npm release if its own follow-up release notes flag a regression) before asking anything.
- Asks once whether to update Node + npm across every pinned location; on approval, edits all of them and — if a local version manager (`nvm`/`volta`/`fnm`) is available — installs and switches to the candidate, then runs a real `npm ci` and `npm run test:workspaces` to verify, deferring to CI if no local switch is possible.

All four commands follow the same hard rule: every version, SHA, and breaking-change claim must come from a live lookup made during that run, not training knowledge. Package versions and their breaking changes can be hours old — recalling what a major version "usually" changes is not a substitute for checking.

## On-demand: code cleanup

Two commands clean up code in three steps (simplify, then tests, then docs) on their own branch. The split follows the upstream sync boundary (`docs/github.md#sync-upstream-template`): code that is template-owned versus code that is downstream-owned.

| Command                        | Scope                                                                                                                           | Duplication check                          | Type check                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------ |
| `/housekeeping-clean-template` | everything except `apps/**` and `db/**`: `common/**`, `scripts/**`, `.githooks/**`, root config, `docs/**`, `.claude/CLAUDE.md` | `npm run ci:dup:root`                      | every project (apps use it)    |
| `/housekeeping-clean-apps`     | `apps/**` and `db/**`, skipping generated files (`crud/*/generated/`, `drizzle/`, `openapi/`, `dev.db/`)                        | `npm run ci:dup:apps`, `npm run ci:dup:db` | `tsc -p` each app, `tsc -p db` |

Both take an optional argument to narrow the scope (e.g. `/housekeeping-clean-apps base-iam`) and run the same way:

1. **Pre-flight:**
   - Stop if the working tree is dirty, or if the current branch is `main` or `rel/*`.
   - Create `chore/housekeeping-<apps|template>-<date>`.
   - Record a baseline: tests with coverage, `tsc`, Biome (no writes) and jscpd. Stop if tests or `tsc` already fail.
2. **Steps:** simplify (duplication, dead code proved unused by searching the whole repo, efficiency, simplification, drift from `docs/conventions.md`), then tests (production code frozen, coverage must not drop), then docs (source frozen).
   - Each step reports a ranked table of findings with evidence and asks which to apply, then applies the chosen ones without asking again.
   - After each step, a scope check reverts any file changed outside the scope. Then the step's tests and `tsc` run, and the step is committed as `chore(<scope>): housekeeping <step>`.
3. **On failure:** stop at once and leave the failing step uncommitted. Nothing is pushed and no PR is opened.

Neither command adds a dependency. The scope-specific rules:

- **`/housekeeping-clean-template`**
  - Checks first whether it is running in the template repo (`origin` matches `UPSTREAM_URL` in `update-template.yml`). In a downstream repo, any edit would be lost on the next sync, so it offers a report-only run instead.
  - Never removes or changes an export of a `common/*` package, because downstream repos may use it. It lists those as deprecation candidates.
  - Runs the full test suite, because the apps depend on this code.
- **`/housekeeping-clean-apps`**
  - Never touches migrations, schema or seed data.
  - Extracts code shared between apps into a shared package under `apps/` (e.g. `@apps/sample-common`), never into template-owned `common/**`.
  - Keeps the example code in `sample-*` apps.
  - Lists clean-architecture breaches for the `clean-architecture-reviewer` agent rather than refactoring them.

For the code you just changed, rather than a whole-scope sweep, use Claude Code's built-in `/simplify`.

## GitHub Actions: commit-SHA pinning convention

The convention is to pin external (non-local) Actions to a full 40-character commit SHA with the version as a trailing comment. Currently only `gitleaks/gitleaks-action` follows it — the rest still use floating tags (`@v7`, `@v4`, …); run `/housekeeping-scan-actions` to pin them. Example:

```yaml
uses: gitleaks/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0
```

This survives upstream tag moves and force-pushes — a floating tag (`@v2`) can be repointed to different code after review; a commit SHA cannot. `/housekeeping-scan-actions` maintains this convention automatically as it updates versions.

Two CI tools in `ci-quality.yml` aren't GitHub Actions or npm packages, so neither Dependabot nor `/housekeeping-scan-actions` updates them — bump them by hand:

- **Semgrep** — the `semgrep/semgrep:<version>@sha256:<digest>` container image.
- **SkillSpector** — installed from git, pinned by `SKILLSPECTOR_REF` (the commit SHA of a release tag, with the tag in a comment). To bump it, resolve the new tag's commit (`git ls-remote https://github.com/NVIDIA/skillspector.git refs/tags/<tag>`), update both, and re-run the scan locally: a new release can change risk scores and flip the gate on unchanged skills.

## npm version ranges: `^` by default, exact pins for lint/format tooling

Dependencies in every `package.json` use a caret range (`^1.64.0`), with the floor kept at the version `package-lock.json` actually resolves. Reproducibility comes from the lockfile — CI and Docker install with `npm ci`, which installs exactly what is locked — so `^` doesn't make builds drift. It does let npm dedupe a package shared across workspaces (e.g. `express`) and lets `npm update` pick up patch/security fixes without editing every `package.json`.

The exception is root devDependencies whose **output** is what CI checks — they are pinned exact (no `^`):

| Package          | Why exact                                                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@biomejs/biome` | Formatter/linter — a patch or minor release can change formatting or add/adjust lint rules, so `biome ci .` (CI and pre-commit) can start failing on unchanged code. Its version is also repeated in the `$schema` URL in `biome.json`, which must match. |
| `prettier`       | Formats `.github/**/*.yml`; checked by `npm run ci:lint-yml` in CI. Prettier documents that even patch releases may change formatting and recommends pinning exact.                                                                                       |
| `jscpd`          | Duplication gate in `ci-quality.yml` — a detection change in a new release can move the duplication percentage and flip the gate on unchanged code.                                                                                                       |

Bump these deliberately, one at a time: update the version (and, for Biome, the `biome.json` `$schema` URL; for Vite, the `vite@<version>` in `deploy-bucket.yml`), then run `npm run check:write` / `npx prettier --write ".github/workflows/*.yml" ".github/actions/**/*.yml"` and commit the reformat together with the bump.
