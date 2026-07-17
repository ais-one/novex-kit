---
description: Audit every tsconfig.json against the TypeScript version that actually resolves for its workspace — report only, never edits
argument-hint: [workspace-or-path filter, optional]
---

Audit every `tsconfig.json` in the repo against the TypeScript version that actually applies to its workspace, and report drift. This command is **read-only** — it never edits `tsconfig.json` or `package.json`. It only produces a report; the user decides separately whether and how to apply anything it finds.

## Hard rule: no guessing

Every "resolved TypeScript version" and every "newest supported target/lib" claim must come from live inspection of the installed `typescript` package *during this run* — never from training knowledge of what a given TypeScript version "usually" supports. TypeScript adds new `target`/`lib` values (e.g. `ES2023`, `ES2024`, `ES2025`) across releases, and this repo can be updated to newer TypeScript at any time, so recalling a remembered feature set is not an acceptable substitute for checking the actual installed compiler. If a lookup fails (package not installed, unreadable file, unexpected shape), stop and report the failure for that item instead of falling back to an assumed value.

## 1. Determine the effective TypeScript version per workspace

- Read the repo root `package.json` for its pinned `typescript` version (`dependencies` or `devDependencies`).
- For every npm workspace (`apps/*`, `common/compiled/*`, `db/*`, `scripts/*`, and any others listed by `npm ls -ws --depth=0`), check whether that workspace's own `package.json` declares its own `typescript` entry.
  - If it does, that workspace-local version **takes precedence** over root for everything under that workspace.
  - If it doesn't, the workspace resolves to the root version (standard npm workspace hoisting).
- Optional argument `$ARGUMENTS` narrows the scan to a workspace path or substring — if empty, scan everything.

## 2. Resolve the actual installed compiler for each effective version

Don't just read the semver range from `package.json` — confirm what's actually installed and importable for that workspace:

- Find the resolved `node_modules/typescript` for that workspace (check the workspace's own `node_modules/typescript/package.json` first — it exists only if that workspace overrides root; otherwise it's hoisted to the repo root's `node_modules/typescript/package.json`).
- Read that package's `version` field directly — this is the real installed version, independent of what the semver range in `package.json` merely allows.
- From that same installed package, read `lib/typescript.d.ts` and extract the `ScriptTarget` enum. Ignore deprecated entries (marked `@deprecated`, e.g. `ES3`/`ES5`/old `Node`/`NodeJs`) and non-version aliases (`ESNext`, `JSON`, `Latest`, `LatestStandard`) — the newest concrete year-numbered entry (e.g. `ES2025`) is the newest target that installed compiler actually supports. Cross-check by confirming a matching `lib.esYYYY.d.ts` file exists in that same `lib/` directory.
- Do the same cross-check for `ModuleResolutionKind` if you need it (e.g. confirming `NodeNext`/`Bundler` are available on very old installs) — flag but don't fail on this dimension, it's secondary to `target`.

## 3. Discover every tsconfig.json and resolve its effective compilerOptions

- Find every `tsconfig.json`/`tsconfig.*.json` in the repo, excluding `node_modules`.
- Map each to its owning workspace (nearest ancestor directory with a `package.json` that is itself an npm workspace root).
- If a config has `"extends"`, follow the chain (e.g. `db/sample/tsconfig.json` → `db/tsconfig.base.json`) and merge `compilerOptions` in the standard TypeScript way (child overrides parent) to get the **effective** `target`/`lib` for that file — a config that inherits `target` from a base file is not "missing" it, it's inherited.
- Record, per tsconfig.json: file path, owning workspace, effective `target` (and where it came from — own file vs inherited via extends), effective `lib` array if explicitly set.

## 4. Compare and classify

For each tsconfig.json:

- **In sync** — effective `target` matches the newest concrete target the resolved compiler for its workspace supports (from step 2).
- **Behind** — effective `target` is older than the newest supported target. Record current → newest.
- **Ahead / invalid** — effective `target` is newer than what the resolved compiler actually supports (can happen if a workspace's `package.json` was bumped but `npm install` hasn't run yet, or vice versa) — flag this distinctly, it's a correctness issue, not just staleness.

Separately, list any workspace whose `package.json` declares its own `typescript` version that differs from the repo root's — this is version drift independent of any single tsconfig.json, and worth surfacing even if that workspace's tsconfig.json happens to already be in sync.

## 5. Report — do not edit anything

Present two tables and stop there:

1. **tsconfig.json audit**: file, owning workspace, resolved TypeScript version (and source: root vs workspace-local override), current effective `target`, newest supported `target`, status (in sync / behind / ahead-invalid).
2. **typescript devDependency drift**: workspace, its own pinned `typescript` version, root's pinned version (only workspaces that actually override root; omit workspaces that simply inherit).

Do not propose or apply any edits, and do not ask the user to approve changes in this run — this command's job ends at the report. If the user wants to act on a finding, that's a separate, explicit follow-up they decide on their own.
