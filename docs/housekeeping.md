# Housekeeping

This document covers how dependencies and GitHub Actions are kept up to date in this repo: what's automated, what's on-demand, and the conventions both follow.

## Automated: Dependabot

`.github/dependabot.yml` runs two weekly update checks:

| Ecosystem | Scope | Interval |
|---|---|---|
| `npm` | root (`/`) | weekly |
| `github-actions` | `.github/workflows/*.yml` and `.github/actions/*` composite actions | weekly |

Dependabot opens one PR per bump. It doesn't research breaking changes, doesn't batch non-major bumps together, and doesn't enforce commit-SHA pinning on Actions — it just proposes the bump and lets CI and review catch problems.

## On-demand: Claude Code housekeeping commands

Four custom slash commands cover the gaps Dependabot leaves — interactive, researched, and batched where it's safe to do so. All four live in `.claude/commands/` and are triggered manually.

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

- Discovers every place a Node/npm version is currently pinned: root `package.json` `engines`, `.github/actions/setup-node-npm-install/action.yml` defaults, any hardcoded `node-version`/matrix overrides in workflows, `CLAUDE.md`/docs prose, any `.nvmrc`, every `apps/*/Dockerfile` (`ARG NODE_VERSION` / `FROM node:…`), and any workspace-level `engines` override.
- Reports the full inventory plus the candidate versions and why they were chosen (e.g. stepping back from the single newest npm release if its own follow-up release notes flag a regression) before asking anything.
- Asks once whether to update Node + npm across every pinned location; on approval, edits all of them and — if a local version manager (`nvm`/`volta`/`fnm`) is available — installs and switches to the candidate, then runs a real `npm ci` and `npm run test:workspaces` to verify, deferring to CI if no local switch is possible.

All four commands follow the same hard rule: every version, SHA, and breaking-change claim must come from a live lookup made during that run, not training knowledge. Package versions and their breaking changes can be hours old — recalling what a major version "usually" changes is not a substitute for checking.

## GitHub Actions: commit-SHA pinning convention

The convention is to pin external (non-local) Actions to a full 40-character commit SHA with the version as a trailing comment. Currently only `gitleaks/gitleaks-action` follows it — the rest still use floating tags (`@v7`, `@v4`, …); run `/housekeeping-scan-actions` to pin them. Example:

```yaml
uses: gitleaks/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0
```

This survives upstream tag moves and force-pushes — a floating tag (`@v2`) can be repointed to different code after review; a commit SHA cannot. `/housekeeping-scan-actions` maintains this convention automatically as it updates versions.

## npm version ranges: `^` by default, exact pins for lint/format tooling

Dependencies in every `package.json` use a caret range (`^1.64.0`), with the floor kept at the version `package-lock.json` actually resolves. Reproducibility comes from the lockfile — CI and Docker install with `npm ci`, which installs exactly what is locked — so `^` doesn't make builds drift. It does let npm dedupe a package shared across workspaces (e.g. `express`) and lets `npm update` pick up patch/security fixes without editing every `package.json`.

The exception is root devDependencies whose **output** is what CI checks — they are pinned exact (no `^`):

| Package | Why exact |
|---|---|
| `@biomejs/biome` | Formatter/linter — a patch or minor release can change formatting or add/adjust lint rules, so `biome ci .` (CI and pre-commit) can start failing on unchanged code. Its version is also repeated in the `$schema` URL in `biome.json`, which must match. |
| `prettier` | Formats `.github/**/*.yml`; checked by `npm run ci:lint-yml` in CI. Prettier documents that even patch releases may change formatting and recommends pinning exact. |
| `jscpd` | Duplication gate in `ci-quality-gates.yml` — a detection change in a new release can move the duplication percentage and flip the gate on unchanged code. |

Bump these deliberately, one at a time: update the version (and, for Biome, the `biome.json` `$schema` URL), then run `npm run check:write` / `npx prettier --write ".github/workflows/*.yml" ".github/actions/**/*.yml"` and commit the reformat together with the bump.
