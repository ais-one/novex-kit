---
description: Check for outdated npm packages, batch-update safe non-major bumps, and walk through major-version bumps one at a time with breaking-change review
argument-hint: [workspace-or-package filter, optional]
---

Check every workspace for outdated npm packages, update the safe ones in one batch, and review major-version bumps individually with real breaking-change research before touching anything.

## Hard rule: no guessing

Every "latest" version, peer-dependency claim, and breaking-change summary must come from a live lookup made *during this run* — `npm outdated`/`npm view` against the real registry, or a fetched changelog/release page — never from training knowledge. Package versions change constantly, and a major version can be hours old (a recent example in this repo: pinia 4.0.0/4.0.1 were both published the same day they were investigated) — recalling "what that package's v4 usually changes" from memory is not an acceptable substitute for checking. If a lookup fails or no changelog can be found, say so explicitly rather than inventing a plausible-sounding summary.

## 1. Discover outdated packages

Run `npm outdated -ws --json` from the repo root — this is the documented way to check outdated packages across all workspaces in this monorepo. Optional argument `$ARGUMENTS` narrows to a workspace path or package-name substring.

For each entry, record: package name, `current`, `wanted`, `latest`, which workspace's `package.json` it lives in, and whether it's a `dependencies` or `devDependencies` entry.

If `npm outdated` reports nothing, tell the user everything is already up to date and stop here.

## 2. Classify each package by major-version delta

Compare the major version number of `current` vs `latest` — not `wanted`. `wanted` only reflects what the existing semver range already allows (e.g. `^3.1.0` caps `wanted` at the highest `3.x`), so relying on it would silently hide an available major bump instead of routing it to review.

- Same major version → **safe** bucket.
- Different major version → **breaking-review** bucket.

## 3. Show the full inventory before touching anything

Present a table of every outdated package found: workspace, package name, current → latest, and which bucket it landed in. Plain listing — no edits, no installs yet.

## 4. Batch-confirm the safe bucket

Ask the user once whether to update every package in the safe bucket to `latest`. If approved:

- For each package, edit its entry in the correct workspace's `package.json`, bumping to `latest` while keeping whatever range prefix that file already uses (`^`, `~`, or exact pin) — don't change the prefix style, only the version number.
- Run a real `npm install` afterward, not `--dry-run` — in this environment `npm install --dry-run` has been observed to still rewrite `package-lock.json` for real, so it is not a safe preview here.
- Run `npm run test:workspaces` (or the specific affected workspace's test script) to confirm nothing broke. If something fails, identify which bumped package is the likely cause and let the user decide whether to keep or revert it — don't silently revert on their behalf.

If the user declines, skip the whole safe bucket and move on.

## 5. Walk through the breaking-review bucket one package at a time

For each package in this bucket, in order, research it before presenting anything:

- Compare peer dependencies between `current` and `latest` via `npm view <pkg>@<version> peerDependencies` for both versions — flag any new, removed, or tightened peer requirement (this is exactly how the pinia 4 bump was found to conflict with `vue-router`'s pinned peer range earlier in this repo).
- Fetch the package's changelog or release notes (GitHub releases via the API if `repository.url` in its `package.json`/registry metadata points to GitHub, or a `CHANGELOG.md`) covering everything between `current` and `latest`, and summarize what's actually listed as breaking.
- Where practical, sanity-check the bump directly: temporarily edit the version in the workspace's `package.json` and run a real `npm install` to see whether it actually resolves cleanly or throws `ERESOLVE` against sibling packages — then revert that trial edit before presenting the result if the user hasn't approved yet.
- Present to the user: current → latest, any peer-dependency changes, the breaking-change summary (or "no changelog found" if genuinely unavailable), and any install conflict discovered. Ask whether to proceed with this specific package.
- On approval: apply the edit for real, run `npm install`, then run the affected workspace's tests. On rejection or skip: leave it untouched and move to the next package.

## 6. Summarize

Report what was updated (safe batch plus any approved major bumps), what was skipped, and any test failures hit along the way. This is a one-pass review per invocation — don't re-litigate skipped packages.
