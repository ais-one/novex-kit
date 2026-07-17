---
description: Check the latest Node.js LTS and npm, confirm CI and workspaces support it, report, and update on approval
argument-hint: [node-only|npm-only, optional]
---

Find the current Active LTS Node.js release and the npm version that goes with it, confirm the repo's CI tooling and workspaces can actually run on it, report everything, then ask once whether to apply the update. Optional argument `$ARGUMENTS` can narrow the run to `node-only` or `npm-only` — if empty, check both.

## Hard rule: no guessing

Every "latest LTS" claim, every "this version has a known serious issue" claim, and every "CI/workspace supports this" claim must come from a live lookup made *during this run* — never from training knowledge. Node.js and npm release on their own schedules and this repo's knowledge of "current" is a snapshot from whenever this command last ran; recalling what was the latest LTS or what version had a bug from memory is not an acceptable substitute for checking. If a lookup fails (network error, unexpected response shape, rate limit), stop and report the failure for that item instead of falling back to an assumed value.

## 1. Discover every place Node/npm versions are currently pinned

- Root `package.json` → `engines.node`, `engines.npm`.
- `.github/actions/setup-node-npm-install/action.yml` → `inputs.node-version.default`, `inputs.npm-version.default` (the shared composite action every workflow calls into).
- Every `.github/workflows/*.yml` (including any under `todo/`) → grep for `node-version:` overrides passed to that composite action, and any hardcoded version in a build `matrix`.
- `CLAUDE.md` / `README.md` / anything under `docs/` → prose mentions like "Node.js X+ required, npm X+ required".
- A repo-root `.nvmrc` or `.node-version` file, if one exists.
- A repo-root `Dockerfile`, if one exists → `FROM node:...` / `ARG NODE_VERSION` style pins.
- Every workspace's own `package.json` (`apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`) → an `engines` field that overrides root (none exist as of the last run this was checked, but re-check live — don't assume that's still true).

Record each as: location, field, current value.

## 2. Resolve the current Active LTS Node.js version live

- Fetch `https://raw.githubusercontent.com/nodejs/Release/main/schedule.json` and compare each major version's `start`/`lts`/`maintenance`/`end` dates against today's date to determine which major is **Active LTS** right now (past its `lts` date, not yet past `maintenance`) versus Current/Maintenance-only/EOL.
- Fetch `https://nodejs.org/dist/index.json` and, within that Active LTS major, find the newest released entry (highest `version` with a non-`false` `lts` codename) — this is the candidate Node version. Note its `npm` field — that's the npm version Node itself bundles, used as a cross-check in step 3.

## 3. Resolve the latest npm version and screen both for serious open issues

- Fetch the npm registry (`npm view npm versions --json` and `npm view npm dist-tags --json`, live) to find the actual latest published npm version.
- Fetch npm's release notes (`https://github.com/npm/cli/releases`) for versions between the repo's currently pinned npm and the latest, and flag anything a release explicitly calls out as a regression, revert, or critical bug fixed in a subsequent release — if the single newest npm version has an unresolved issue like that called out in the *next* release's notes, step back to the last version without an open flag and say why.
- Do the same sanity pass for the candidate Node version: fetch `https://nodejs.org/en/blog/vulnerability/` (or `https://endoflife.date/api/nodejs.json` as a cross-check for support/EOL windows) and confirm the candidate is the newest *patch* in its LTS line — never propose a patch older than the newest available, and call out explicitly if the newest patch itself was a security release (that's expected and fine — it means the fix is already in).

## 4. Confirm CI can actually pull the candidate Node version

- Fetch `https://raw.githubusercontent.com/actions/node-versions/main/versions-manifest.json` and confirm an entry exists for the candidate version (or its major.minor) with a `linux-x64` download, since this repo's workflows run on `ubuntu-latest`. Absence isn't automatically fatal — `actions/setup-node` can fall back to nodejs.org directly — but note it either way.
- Note the `actions/setup-node` version currently pinned in `setup-node-npm-install/action.yml` (just note it — bumping the action itself, if needed, is `/housekeeping-scan-actions`'s job, not this command's).

## 5. Confirm the workspaces themselves support the candidate version

- Confirm none of the workspace `package.json` files declare an `engines.node`/`engines.npm` range that would exclude the candidate (static check against what step 1 found).
- Scan installed dependencies for a hard incompatibility: search `node_modules/**/package.json` (both plain and scoped `@scope/*` packages) for an `engines.node` field, and for each one use Node's own semver to test whether the candidate version actually satisfies that range (e.g. `node -e "console.log(require('semver').satisfies('<candidate>', '<range>'))"` using the repo's own installed `semver`, or a simple manual range check if `semver` isn't resolvable standalone) — flag any dependency whose range would reject the candidate.
- Note whether a local Node version manager (`nvm`, `volta`, or `fnm`) is available in this environment. If one is, this is the strongest verification available — installing the candidate and running a real `npm ci` + test pass — but treat that as part of the apply step in section 7, gated on approval, since installing a new runtime is a real environment change, not something to do just to produce a report.

## 6. Report — before proposing anything

Present:
- A table of every current pin from step 1 (location, field, current value).
- The candidate Node.js version (with LTS codename and support/EOL window) and candidate npm version, with the reasoning from step 3 for why each was chosen over the single newest thing that exists (or confirmation there was no reason to step back).
- The CI-support and workspace-support findings from steps 4–5.

## 7. Ask once, then apply on approval

Ask a single question: update Node to `<candidate>` and npm to `<candidate>` across every location found in step 1? (Respect `$ARGUMENTS` if it was `node-only`/`npm-only` — only ask about, and only touch, that one.)

- **If declined**: make no changes, summarize what was found, stop.
- **If approved**:
  - Edit every location from step 1 to the new version(s) — root `package.json` engines, the composite action's defaults, any hardcoded workflow overrides, and the prose mentions in `CLAUDE.md`/docs. Keep each file's existing style (e.g. matrix arrays, quoting) — change only the version values.
  - If a local version manager was found in step 5, install and switch to the candidate Node version, install the candidate npm globally, then run a real `npm ci` (not `--dry-run`) followed by `npm run test:workspaces`. Report pass/fail plainly — if something fails, identify what broke and let the user decide whether to keep the update or revert, don't silently revert on their behalf.
  - If no local version manager was available, say so explicitly and note that CI (`ci.yml`) is the next real verification point, since this environment couldn't run the new version directly.

## 8. Summarize

Report what changed (or didn't), what was verified locally versus deferred to CI, and any findings the user should keep an eye on next time this runs (e.g. an LTS line approaching maintenance/EOL soon).
