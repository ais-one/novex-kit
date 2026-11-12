---

description: Check the latest Node.js LTS and npm, confirm CI and workspaces support it, report, and update on approval
argument-hint: [node-only|npm-only, optional]
---

Find the current Active LTS Node.js release and the npm version that goes with it, confirm the repo's CI tooling and workspaces can actually run on it, report everything, then ask once whether to apply the update. Optional argument `$ARGUMENTS` can narrow the run to `node-only` or `npm-only` — if empty, check both.

## Hard rule: no guessing

Every "latest LTS" claim, every "this version has a known serious issue" claim, and every "CI/workspace supports this" claim must come from a live lookup made _during this run_ — never from training knowledge. Node.js and npm release on their own schedules and this repo's knowledge of "current" is a snapshot from whenever this command last ran; recalling what was the latest LTS or what version had a bug from memory is not an acceptable substitute for checking. If a lookup fails (network error, unexpected response shape, rate limit), stop and report the failure for that item instead of falling back to an assumed value.

## Pinning policy

Every location is pinned to the **exact** `major.minor.patch` version — Node and npm alike, with no ranges, floors or major-only pins anywhere:

| Locations                                                                                                                                                                                                                        | Example                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| composite action `node-version`/`npm-version` defaults, workflow `node-version`/`matrix` values, `.nvmrc`, `Dockerfile` `ARG NODE_VERSION` (and `node:<version>-alpine` references in comments), example workflows under `docs/` | `24.22.1`                                  |
| root and workspace `package.json` `engines` (and their `package-lock.json` copies)                                                                                                                                               | `"node": "24.22.1"`, `"npm": "11.18.0"`    |
| version requirements stated in prose — `.claude/CLAUDE.md`, `README.md`, `docs/`                                                                                                                                                 | `Node.js 24.22.1 and npm 11.18.0 required` |

All of them change on every update, patch bumps included. (A passing mention of the major that isn't a requirement — e.g. "TypeScript runs natively via Node 24" — is not a pin and can stay.)

### Drift is not allowed

A location has **drifted** if it is either:

- **not exact** — a range or floor (`>=24`, `^24.22.0`, `~11.18`, `Node.js 24+`), a major-only or major.minor pin (`"24"`, `24.22`, `node:24-alpine`), or a tag like `lts/*`/`latest`; or
- **out of sync** — exact, but a different version from the **baseline**: the composite action's `node-version`/`npm-version` defaults in `.github/actions/setup-node-npm-install/action.yml`.

Drift is a defect this command must fix, not an observation to pass along. No run of this command may end with drift still in the repo:

- Drift is fixed whether or not the version update in step 7 is approved — to the candidate version if the update is approved, otherwise to the current baseline.
- `$ARGUMENTS` (`node-only`/`npm-only`) narrows which version is _updated_, not which drift is _fixed_ — Node and npm drift are both fixed on every run.
- If the baseline itself isn't usable — the composite action's default is missing or not exact — don't guess one from the other locations: stop, show every value found, and ask the user which exact version is the baseline before changing anything.
- Step 8 re-checks every location. Any drift left over is a failure of the run, and is reported as one.

## 1. Discover every place Node/npm versions are currently pinned

- Root `package.json` → `engines.node`, `engines.npm`.
- `.github/actions/setup-node-npm-install/action.yml` → `inputs.node-version.default`, `inputs.npm-version.default` (the shared composite action every workflow calls into).
- Every `.github/workflows/*.yml` (including any under `todo/`) → grep for `node-version:` overrides passed to that composite action, and any hardcoded version in a build `matrix`.
- `.claude/CLAUDE.md` / `README.md` / anything under `docs/` → prose mentions like "Node.js X+ required, npm X+ required".
- Example workflows under `docs/` (e.g. `docs/cloud/cloudflare/cf_cicd_purge.yml`) → `node-version:` passed straight to `actions/setup-node`. These don't go through the composite action, so they need their own edit.
- A repo-root `.nvmrc` or `.node-version` file, if one exists.
- Every `Dockerfile` in the repo (currently `apps/*/Dockerfile`, e.g. `apps/sample-api/Dockerfile`; also a repo-root one if it ever exists) → `FROM node:...` / `ARG NODE_VERSION` style pins, plus `node:<version>-alpine` mentions in comments.
- Every workspace's own `package.json` (`apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`) → an `engines` field that overrides root (currently `apps/sample-rest-app-v2` and `apps/sample-queue-consumer`; re-check live, the list changes). `package-lock.json` keeps a copy of each workspace's `engines` under `packages["<workspace path>"]`, so update those copies on every version change (the root package's own copy lives under `packages[""]`).

Record each as: location, field, current value, and status — **OK**, **drift: not exact**, or **drift: out of sync** (see [Drift is not allowed](#drift-is-not-allowed)). Also look beyond the known list: grep the whole repo (excluding `node_modules`) for `node-version`, `npm-version`, `NODE_VERSION`, `node:<digits>`, `"engines"`, `.nvmrc`/`.node-version`, and "Node.js <n>"/"npm <n>" requirement wording, so a new pin that nobody added to this list still gets caught.

## 2. Resolve the current Active LTS Node.js version live

- Fetch `https://raw.githubusercontent.com/nodejs/Release/main/schedule.json` and compare each major version's `start`/`lts`/`maintenance`/`end` dates against today's date to determine which major is **Active LTS** right now (past its `lts` date, not yet past `maintenance`) versus Current/Maintenance-only/EOL.
- Fetch `https://nodejs.org/dist/index.json` and, within that Active LTS major, find the newest released entry (highest `version` with a non-`false` `lts` codename) — this is the candidate Node version. Note its `npm` field — that's the npm version Node itself bundles, used as a cross-check in step 3.

## 3. Resolve the latest npm version and screen both for serious open issues

- Fetch the npm registry (`npm view npm versions --json` and `npm view npm dist-tags --json`, live) to find the actual latest published npm version.
- Fetch npm's release notes (`https://github.com/npm/cli/releases`) for versions between the repo's currently pinned npm and the latest, and flag anything a release explicitly calls out as a regression, revert, or critical bug fixed in a subsequent release — if the single newest npm version has an unresolved issue like that called out in the _next_ release's notes, step back to the last version without an open flag and say why.
- Do the same sanity pass for the candidate Node version: fetch `https://nodejs.org/en/blog/vulnerability/` (or `https://endoflife.date/api/nodejs.json` as a cross-check for support/EOL windows) and confirm the candidate is the newest _patch_ in its LTS line — never propose a patch older than the newest available, and call out explicitly if the newest patch itself was a security release (that's expected and fine — it means the fix is already in).

## 4. Confirm CI can actually pull the candidate Node version

- Fetch `https://raw.githubusercontent.com/actions/node-versions/main/versions-manifest.json` and confirm an entry exists for the candidate version (or its major.minor) with a `linux-x64` download, since this repo's workflows run on `ubuntu-latest`. Absence isn't automatically fatal — `actions/setup-node` can fall back to nodejs.org directly — but note it either way.
- Note the `actions/setup-node` version currently pinned in `setup-node-npm-install/action.yml` (just note it — bumping the action itself, if needed, is `/housekeeping-scan-actions`'s job, not this command's).

## 5. Confirm the workspaces themselves support the candidate version

- Confirm none of the workspace `package.json` files declare an `engines.node`/`engines.npm` range that would exclude the candidate (static check against what step 1 found).
- Scan installed dependencies for a hard incompatibility: search `node_modules/**/package.json` (both plain and scoped `@scope/*` packages) for an `engines.node` field, and for each one use Node's own semver to test whether the candidate version actually satisfies that range (e.g. `node -e "console.log(require('semver').satisfies('<candidate>', '<range>'))"` using the repo's own installed `semver`, or a simple manual range check if `semver` isn't resolvable standalone) — flag any dependency whose range would reject the candidate.
- Note whether a local Node version manager (`nvm`, `volta`, or `fnm`) is available in this environment. If one is, this is the strongest verification available — installing the candidate and running a real `npm ci` + test pass — but treat that as part of the apply step in section 7, gated on approval, since installing a new runtime is a real environment change, not something to do just to produce a report.

## 6. Report — before proposing anything

Present:

- A table of every current pin from step 1 (location, field, current value, status), with drifted rows listed first, and what each will be changed to.
- The candidate Node.js version (with LTS codename and support/EOL window) and candidate npm version, with the reasoning from step 3 for why each was chosen over the single newest thing that exists (or confirmation there was no reason to step back).
- The CI-support and workspace-support findings from steps 4–5.

## 7. Ask once, then apply on approval

Ask a single question: update Node to `<candidate>` and npm to `<candidate>` across every location found in step 1? (Respect `$ARGUMENTS` if it was `node-only`/`npm-only` — only ask about that one version update. Drift in both is still fixed, see below.) If there is drift, the question also says it will be fixed either way, and lists to which version.

- **If declined**: don't update any version. Still fix every drifted location to the current baseline (exact version, same as the composite action's defaults), then go to step 8.
- **If approved**:
  - Edit every location from step 1 to the new version(s), following the [pinning policy](#pinning-policy). Every location gets the full candidate version, patch bumps included: the composite action's defaults, workflow overrides and matrices, `docs/` example workflows, `.nvmrc`, Dockerfile `ARG NODE_VERSION`, root/workspace `engines` and their `package-lock.json` copies, and version requirements in `.claude/CLAUDE.md`/docs prose. Keep each file's existing formatting (matrix arrays, quoting) and change only the version values.
  - If a local version manager was found in step 5, install and switch to the candidate Node version, install the candidate npm globally, then run a real `npm ci` (not `--dry-run`) followed by `npm run test:workspaces`. Report pass/fail plainly — if something fails, identify what broke and let the user decide whether to keep the update or revert, don't silently revert on their behalf.
  - If no local version manager was available, say so explicitly and note that CI (`ci-tests.yml`, plus the other `ci-*.yml` workflows) is the next real verification point, since this environment couldn't run the new version directly.

## 8. Verify zero drift, then summarize

Re-run the discovery from step 1, repo-wide grep included, against the files as they are now. Every location must be exact and equal to the baseline (the candidate if the update was approved). If any location still drifts, fix it and check again. If it can't be fixed — e.g. a file this command shouldn't edit — report the run as **failed** and name the location. Don't call the run done while drift remains.

Then report what changed (or didn't), including which drifted locations were fixed and from what values, what was verified locally versus deferred to CI, and any findings the user should keep an eye on next time this runs (e.g. an LTS line approaching maintenance/EOL soon).
