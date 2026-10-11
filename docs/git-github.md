## Hooks Setup And Usage

This repository uses native Git hooks in `.githooks/`.

- Pre-commit runs Biome checks on affected directories and schema validation tests where applicable.
- Commit-msg validates the message against Conventional Commits (`feat`, `fix`, `chore` only).
- Pre-push runs workspace tests and schema validation checks.
To skip hooks temporarily:
```bash
git commit --no-verify
git push --no-verify
```

They are activated automatically by `npm install` — its `prepare` script runs [.githooks/setup.sh](../.githooks/setup.sh), which:
- marks `pre-commit`, `commit-msg` and `pre-push` executable
- clears any existing `core.hooksPath` (`--unset-all`, so a key set more than once doesn't block the update), then sets it to `.githooks` in this clone's `.git/config`

If installed with `--ignore-scripts`, or to re-apply the setup without reinstalling:

```bash
npm run prepare
```

A failure (e.g. not a git checkout, as in a Docker build) prints `Can not set git hooks` but does not fail the install — check the install output if hooks don't fire.

**Windows:** `prepare` calls `sh`, works on macOS and Linux but isn't on the `cmd.exe` PATH in a default Git for Windows install.

Either run `npm install` from Git Bash, or point npm at Git's bash once so every npm script runs through it:

```bash
npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"
npm run prepare
```

### pre-commit hook

Runs automatically on every `git commit`:

| Check | Details |
|-------|---------|
| **Biome format & lint** | Runs `npx biome check` on each affected directory (`common/vanilla/iso`, `common/compiled/node`, `common/compiled/vue`, `common/vanilla/web`, `apps`, `scripts`). Run `npm run check:write` to auto-fix. |
| **Schema validation tests** | Runs `npm run test:schemas -- <folder>` for each affected schema directory (`common/schemas`, `apps/*/schemas`). |

To skip the pre-commit hook temporarily:
```bash
git commit --no-verify
```

### pre-push hook

Runs automatically on every `git push`:

| Check | Details |
|-------|---------|
| **Workspace tests** | Runs `npm run test --workspace=<ws>` for every workspace (`apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`) that has a `test` script, touched or not. Unit + integration only — e2e is disabled for now. |
| **Schema validation tests** | Runs `npm run test:schemas` for `common/schemas` and every `apps/*/schemas` directory (touched or not), if the root script exists. |
| **Security audit** | Runs `npm run ci:audit`; on findings, prompts `y/n` to continue the push. |

To skip the pre-push hook temporarily:
```bash
git push --no-verify
```

## Github Repo Setup

### Rulesets

Create the following Rulesets

#### Ruleset - protected-branches-all

To prevent merges or pushes under certain conditions.

**Settings** → **Rulesets** → **Rulesets** → **New Ruleset** → **New branch ruleset**.

1. Enforcement status = Active
2. Match the following patterns:
  - main
  - rel/[0-9]*.[0-9]*
3. Enable the following branch rules
  - Restrict deletions
  - **Require a pull request before merging**
    - Require at least 1 approval
    - Dismiss stale approvals on new commits
    - **Require review from Code Owners** Changes under `.github/` need approval from the owners in [CODEOWNERS](../.github/CODEOWNERS).
    - **Require conversation resolution before merging**
    - Methods Allowed: Squash
  - **Require status checks to pass**
    - Require branches to be up to date before merging
    - `Lint Summary` (the single gate job of `ci-lint.yml` — it fails if any lint job fails or is cancelled, so don't require `Commit Message Format`, `Biome Checks` or `Lint Workflow YAML` individually)
    - `Quality Gates / Quality Gate Summary`, `Tests / Test Summary` (the single gate job of `ci-tests.yml` — it fails if any test job fails or is cancelled, so don't require the individual test jobs; the tests are **currently disabled**, and skipped jobs count as passing, so it doesn't block anything until they're re-enabled).
  - Block force pushes


#### Ruleset - protected-branches-main

1. Enforcement status = Active
2. Match the following patterns:
  - main
3. Enable the following branch rules
  - **Require status checks to pass**
    - `Allowed Source Branch` (from `ci-source-branch.yml`) — see [Restricting PR source branches into main](#restricting-pr-source-branches-into-main)
  - Require a pull request before merging
    - Methods Allowed: Merge

- Only `rel/[0-9]*.[0-9]*` branches may merge into `main` — hotfixes reach `main` through their release branch (see [Hotfix & Backport Flow](#hotfix--backport-flow)). GitHub branch protection and rulesets can't restrict a PR's *source* branch, so [ci-source-branch.yml](../.github/workflows/ci-source-branch.yml) enforces it as a status check:
- Runs on every PR into `main` (`opened`, `synchronize`, `reopened`, `edited` — the last catches a PR retargeted to `main` after it was opened).
- **Allowed Source Branch** fails unless the head branch matches `rel/<major>.<minor>`.
- Fork PRs fail outright — a fork can name its branch `rel/1.0`, so only branches in this repository count.

#### Ruleset - protected-branches-release
1. Enforcement status = Active
2. Match the following patterns:
  - rel/[0-9]*.[0-9]*
3. Enable the following branch rules
  - Require a pull request before merging
    - Methods Allowed: Squash
  - Require status checks to pass
    - `PR Title Format` (from `ci-pr-title.yml`)
    - `Lint Summary`
    - `Quality Gates / Quality Gate Summary`
    - `Tests / Test Summary`
  - Require code scanning results
    - CodeQL

#### Ruleset - protected-tags

To stop a published release tag from being moved or deleted

Create a tag ruleset in **Settings** → **Ruleset** → **Rulesets** → **New ruleset** → **New tag ruleset**.

Target tags matching the following patterns:

Both tag formats are created by the `Release` workflow — see [Release Automation](#release-automation).

1. Enforcement status = Active
2. Match the following patterns:
  - template core release
    - v[0-9]*.[0-9]*.[0-9]*
    - v1.2.3
  - workspace release
    - *-v[0-9]*.[0-9]*.[0-9]*
    - apps-sample-api-v1.2.3
3. Enable the following tag rules
  - Leave **Restrict creations** off — the `Release` workflow creates tags with its own `GITHUB_TOKEN`.
  - Restrict updates -  A pushed tag can't be moved to another commit — release a new patch version instead. |
  - Restrict deletions
  - Block force pushes



### Repository Environment

1. Settings → Environments → production (create New environment if it doesn't exist yet).
2. Under Environment secrets, add the secrets listed in [Environment Workflow Secrets](secrets-vars.md#environment-workflow-secrets).
3. On the same page, set up the rules:
  - Required reviewers: add the people or teams who may approve deploys.
  - Prevent self-review: optional; stops whoever started the run from approving it.
  - Deployment branches and tags: "Selected branches and tags", for example main and rel/*.

### Advanced Security

#### Code Scanning

- On GitHub, go to Settings → Advanced Security
- Enable Dependency graph, Dependabot alerts and Secret scanning (also turn on push protection).
- Leave CodeQL **Default setup** off — code scanning is done by workflow (GitHub rejects workflow CodeQL uploads while default setup is on).

**Workflow ([ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml))**
- **Semgrep** (`sast-private-repo-semgrep`, private/internal repos only) — static analysis on PRs and pushes to `main` and ``rel/[0-9]*.[0-9]*``. Fails the job on findings, so it blocks `Quality Gate Summary`. The SARIF report is kept as a build artifact, not uploaded to the Code scanning tab.
- **CodeQL** (`sast-public-repo-codeql`, public repos only) — scans `javascript-typescript`, `python` and `actions` (workflow files) with the `security-extended` query suite, `build-mode: none`.
  - Skipped on private repos (they need GitHub Code Security). If you have it, remove the `github.event.repository.visibility == 'public'` condition on the `sast-public-repo-codeql` job (and change the `sast-private-repo-semgrep` condition if you don't want both).
  - The job succeeds even when it finds issues — results go to **Security** → **Code scanning**. To block merges on findings, add a **Require code scanning results** rule (tool: CodeQL) to the ruleset for `main` and ``rel/[0-9]*.[0-9]*``.

This is separate from `NPM audit` job in the same workflow (checks for known CVEs in dependencies): Semgrep/CodeQL are static analysis of this repo's own source code.

#### Dependabot

Version-update PRs are already configured in [.github/dependabot.yml](../.github/dependabot.yml):

- `npm` — root directory (covers all workspaces: `apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`)
- `github-actions` — `/` for workflow files plus `.github/actions/*` for composite actions (e.g. `checkout`, `setup-node-npm-install`)

Both run weekly and need no workflow file — GitHub schedules them itself.

Separately, enable **Dependabot alerts** via **Settings** → **Advanced Security** → **Dependabot alerts** — this flags known CVEs in dependencies as they're published, complementing (not replacing) the `NPM audit` job in `ci-quality-gates.yml`.

---

## Branching And Protection

### Branch & Tag Names

- <feat/fix/chore>/scope/<...>
- rel/<current release version>, rel/<next release version>
  - can add -rc.1, -beta.1 suffixes as needed
- hotfix/<scope>/<...>
- v<version> (root tag)
- <path-with-dashes>-v<version> (workspace tag, e.g. `apps-sample-api-v1.2.3`)
- main

Examples:
- release branch: rel/1.1
- patch tags: v1.1.1
- beta release: rel/1.1-beta.4

### Branch Creation And Merge Flow

Use the table below to find out how to name branches based on action taken. Usually, contributors will create feat/fix/chore based off a `rel` branch

| Branch | Branch from | Merge to | Notes |
|---|---|---|---|
| `rel/1.0` | `main` | `main` when production ready | Active dev branch |
| `feat/fix/chore` | `rel/1.0` | `rel/1.0` via PR | Day-to-day work |
| `hotfix/scope/name` | the commit shared by every target, usually the production tag (`v1.0.0`) | one PR each into `rel/1.0` and every newer `rel/*` | Emergency only |
| `tag: v1.0.0` | `rel/1.0` after merge to main | — | Full release tag |
| `tag: v1.0.1` | `rel/1.0` after hotfix merges in | — | Patch tag, then merge `rel/1.0` into `main` |
| `rel/2.0` | `main` after `v1.0.0` tag | `main` when ready | Next dev cycle, cut from stable tag |

The consistent rule is: **tags always come from `rel/[0-9]*.[0-9]*`**, never directly from `main`, and **`main` only receives merges from `rel/[0-9]*.[0-9]*`**. Main is the destination, not the source of truth for what shipped.

Merge `rel/x.y` into `main` with a **merge commit, never a squash** — `rel/1.0` is merged into `main` more than once (at `v1.0.0`, then after every patch release), and a squash doesn't record that `rel/1.0` was merged, so the next merge would replay its history and conflict.

### Hotfix & Backport Flow

One hotfix branch, one PR per target branch — no cherry-picking. Example: `rel/1.0` is in production (`v1.0.0`), `rel/1.1` and `rel/2.0` are not released yet.

```
hotfix/payment-crash (branch from the commit all targets share - here the v1.0.0 tag)
  → PR into rel/1.0 (squash)
      → release v1.0.1 from rel/1.0 (Release workflow)   ← fix is shippable here
      → PR rel/1.0 into main (merge commit)              ← main matches production again
  → PR into rel/1.1 (squash)                             ← no tag; ships in 1.1.0
  → PR into rel/2.0 (squash)                             ← no tag; ships in 2.0.0
```

**1. Create the branch from the shared base**

```bash
git fetch origin
# the newest commit contained in every branch the fix must reach
BASE=$(git merge-base --octopus origin/rel/1.0 origin/rel/1.1 origin/rel/2.0)
git describe --tags "$BASE"   # usually the production tag, e.g. v1.0.0
git switch -c hotfix/payment-crash "$BASE"
# fix, commit (Conventional Commits), push
```

Branch from the shared base, not from `rel/1.0` or the latest patch tag: anything after that point that isn't in every target (e.g. an earlier hotfix's squash commit on `rel/1.0`, or `v1.0.1`) would show up in the PRs into the newer branches. Each PR's diff should contain only this fix.

**2. Open one PR per target** — `rel/1.0` (the line in production) plus every newer, supported `rel/*` branch that has the bug. Each PR runs CI against its own target and shows its own conflicts. Older lines no longer in production are skipped.

**3. Merge the production PR first, then release** — the tag is the critical path: nothing ships until `v1.0.1` exists, and tags only come from `rel/x.y`.
- Everything merged into `rel/1.0` since the last tag ships in the patch too — check `git log v1.0.0..rel/1.0` before releasing.
- Then merge `rel/1.0` into `main` (merge commit) right after tagging, so `main` never holds unreleased work.

**4. Merge the remaining PRs.** Only lines in production get a patch tag; unreleased lines ship the fix in their next release.

Caveats:
- **Keep the hotfix branch until every PR is merged.** Deleting a branch closes all open PRs from it — don't click **Delete branch** after the first merge, and if **Settings → General → Automatically delete head branches** is on, use **Restore branch** on the merged PR, then reopen the others.
- **Conflicts in a newer line** (the code changed there): resolve with GitHub's conflict editor if simple; otherwise branch `hotfix/payment-crash-rel-2.0` from `rel/2.0`, re-apply the fix there, and PR that instead.
- **Squash merge means each target gets its own commit** for the same fix — expected. When `rel/1.1` is later merged into `main`, git sees the identical change on both sides and normally merges it cleanly.

---

## Commit Message

For standardized [Conventional Commits](https://www.conventionalcommits.org/) messages, use **czg** instead of `git commit -m "…"`:

```bash
# Interactive prompt (guided commit message)
npx czg

# AI-generated commit message (requires API key configured in czg)
npx czg --ai
```

Install globally for convenience:
```bash
npm install -g czg
```

Use the repository commit conventions in [docs/conventions.md](../docs/conventions.md) for allowed commit types and breaking-change notation.

When choosing a scope in `czg`:

- Prefer a real workspace scope such as `apps/...` or `common/...` when the change is limited to one workspace.
- Use `docs` for documentation-only changes.
- Use `ci` for workflow, hook, or automation changes.
- Use `repo` for root-level or cross-cutting changes that do not fit a single workspace.

---

## Release Management

Releases are cut manually by the `Release` workflow [.github/workflows/release.yml](../.github/workflows/release.yml). It uses [git-cliff](https://git-cliff.org) ([cliff.toml](../cliff.toml)) to work out the next version and release notes from Conventional Commits, then creates the tag and a GitHub release. Tests are not re-run — branch protection already requires PR checks to pass before merge.

- **Tags are the source of truth for versions.** Nothing is committed back to the branch (no version bump in `package.json`, no `CHANGELOG.md`), so the workflow needs no branch-protection bypass, GitHub App or PAT — its own `GITHUB_TOKEN` is enough.
- Run it from a `rel/<major>.<minor>` branch (e.g. `rel/1.0`); any other branch, including `main`, fails fast.
- Troubleshooting lives in [release-troubleshooting.md](./release-troubleshooting.md).

### Components and tags

| `workspace` input | Tag | Commits considered |
|---|---|---|
| `.` (default) | `v1.2.3` | all commits — the template core; marked as the repo's "Latest" release |
| `apps/sample-api` (any workspace path) | `apps-sample-api-v1.2.3` | only commits touching that path |

A component's **first** release (no matching tag yet) uses the version already in its `package.json` as-is.
Set that version before the first run if it isn't what you want.

### Inputs

- `workspace` — `.` or a workspace path with a `package.json`.
- `bump` — `auto` (default) derives it from commits since the component's last tag: breaking change (`!` or `BREAKING CHANGE:` footer) → major, `feat` → minor, anything else (`fix`, `chore`) → patch. Or force `patch`/`minor`/`major`.
- `dry-run` — print the next version and notes to the job summary without creating anything.

The run fails if the computed tag already exists, i.e. there are no new commits for that component since its last release.

### Previewing locally

```bash
npx git-cliff --tag-pattern '^v[0-9]+\.[0-9]+\.[0-9]+$' --bumped-version          # next template-core version
npx git-cliff --tag-pattern '^v[0-9]+\.[0-9]+\.[0-9]+$' --unreleased --strip all  # its release notes
# a workspace: add --include-path 'apps/sample-api/**' and use '^apps-sample-api-v[0-9]+\.[0-9]+\.[0-9]+$'
```

### Using the version at deploy time

Because `package.json` versions aren't bumped in the repo, a deploy job that needs the version should read it from the tag it checked out, e.g. `npm version "${TAG##*v}" --no-git-tag-version --workspace=<path>` before building or publishing.

---

## Rebase Or Merge

Use the repo workflow rather than a per-team merge style.

- Day-to-day feature and fix PRs should use squash merge.
  - The PR title becomes the squash commit message, so it must follow Conventional Commits — enforced by `PR Title Format` ([ci-pr-title.yml](../.github/workflows/ci-pr-title.yml)).
  - Set **Settings** → **General** → **Pull Requests** → **Allow squash merging** → **Default commit message** to **Pull request title** (or **Pull request title and description**). The GitHub default uses the commit message instead of the title when the PR has a single commit, which would bypass the title check.
- Open those PRs from `feat/*`, `fix/*`, or `chore/*` into the active `rel/[0-9]*.[0-9]*` branch.
- Reserve `hotfix/*` branches for urgent fixes: branch from the commit shared by every target `rel` branch (usually the production tag), open one PR into the `rel/[0-9]*.[0-9]*` branch in production and one into each newer supported `rel` branch, release a patch from the production line, then merge it into `main` — see [Hotfix & Backport Flow](#hotfix--backport-flow).

This keeps the commit history git-cliff reads clean and matches the contributor workflow in [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md).

---

## CI

Please read the following scripts for information on the CI workflows

1. Source branch workflow [ci-source-branch.yml](../.github/workflows/ci-source-branch.yml) — only `rel/x.y` may merge into `main` (standalone, not called from `ci-lint.yml`)
2. PR title workflow [ci-pr-title.yml](../.github/workflows/ci-pr-title.yml) — PR title must follow Conventional Commits, since it becomes the squash commit message (standalone, so a title edit re-runs only this check)
3. Lint workflow [ci-lint.yml](../.github/workflows/ci-lint.yml) — commit messages, Biome, workflow YAML
4. Tests workflow [ci-tests.yml](../.github/workflows/ci-tests.yml) — schema, unit, integration, e2e (**currently disabled**: every job is gated `if: false && …`)
5. Quality gates workflow [ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml) — security scans, coverage, duplication

Tests and Quality gates workflow depend on Lint to pass to run.

Changes to `.github/` can go in the same PR as other code. Review of them is enforced by [CODEOWNERS](../.github/CODEOWNERS) (`/.github/` entry) — enable **Require review from Code Owners** in the branch protection rules / ruleset for `main` and ``rel/[0-9]*.[0-9]*``.

The configured branch protection rules apply uniformly across day-to-day work (`rel/[0-9]*.[0-9]*` branches), production merges (`main`), and emergency hotfixes.

### CI Workflow

1. PR submitted to main or release branches
2. CI runs on PR submitted
  - format + lint check (Biome) and commit message check — in [ci-lint.yml](../.github/workflows/ci-lint.yml), on every branch
  - repo-wide schema check, no autofix
  - testing of all workspaces, no autofix
  - repo-wide package audit (`NPM audit`), no autofix
3. Only allow merge if all checks pass and approvals are met

> **Note:** tests (unit, integration) run in every workspace that has the matching npm script (`npm run <script> --workspaces --if-present`); others are skipped. Integration tests run on `pull_request` only, not on push. The e2e job is commented out for now.

### Lint Workflow

[ci-lint.yml](../.github/workflows/ci-lint.yml) runs on PRs and pushes on **every** branch, with no change-scope detection:

- **Commit Message Format** — every commit in the PR / push must follow Conventional Commits (`feat|fix|chore`).
- **Biome Checks** — `biome ci .` on the whole repository.
- **Lint Workflow YAML** — `prettier --check` on `.github/workflows/*.yml` and `.github/actions/**/*.yml`, then `actionlint` (with shellcheck for `run:` scripts) on `.github/workflows/*.yml`. Drafts in `.github/workflows/todo/` are skipped (GitHub does not run workflows in subfolders). Known false positives are ignored in [.github/actionlint.yaml](../.github/actionlint.yaml). Check locally with `npm run ci:lint-yml`; fix with `npx prettier --write ".github/workflows/*.yml" ".github/actions/**/*.yml"` (prettier is a pinned root devDependency).
- **Lint Summary** — the single required check for lint: fails if any job above fails or is cancelled. Add new lint jobs to its `needs:`.

A push to a branch with an open PR triggers both a push and a PR run.

### Quality Gates Workflow

[ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml) is called by `ci-lint.yml` after lint passes, on PRs and pushes to `main` and ``rel/[0-9]*.[0-9]*``:

- **Gitleaks secret scan** — scans the git history for committed secrets.
- **NPM audit** — `npm run ci:audit` against the root lockfile (all workspaces).
- **Dependency vulnerability scan** — `dependency-review-action` blocks PRs that add dependencies with known vulnerabilities (PRs on public repos only; needs the dependency graph enabled).
- **Security Scan - Semgrep** (private/internal repos) — security scan; on PRs only *new* findings fail the job. The SARIF report is kept as a build artifact.
- **SAST CodeQL Analysis** (public repos) — security scan; results go to Security → Code scanning (see [Code Scanning](#code-scanning)).
- **Test Coverage** — runs every workspace whose `test:unit` script uses `node --test` (`--test-reporter=spec`) with an extra lcov reporter, merges the reports into `coverage/lcov.info` and uploads it to Codecov if `CODECOV_TOKEN` is set.
- **Duplication Check (jscpd)** — fails if duplication exceeds 5% (optional; see the workflow header to drop it or make it advisory).

Setup:

1. Sign in to [Codecov](https://about.codecov.io/) with GitHub and add this repository.
2. Copy the repository upload token and add it as Actions secret `CODECOV_TOKEN` (Settings → Secrets and variables → Actions). Optional — without it the Codecov upload is skipped (unit tests still run); with it, an upload error fails the job (`fail_ci_if_error: true`).
3. If the repository is owned by a GitHub **organization**, get a free license key from [gitleaks.io](https://gitleaks.io/) and add it as Actions secret `GITLEAKS_LICENSE`. Every Gitleaks step is gated on this secret, so **without it the scan is skipped on any repo** — personal-account repos don't need a real license, but must still set the secret (any value) to enable the scan.
4. Enable the **Dependency graph** (Settings → Advanced Security) — `dependency-review-action` needs it. On private repos the job is skipped (it needs GitHub Code Security); if you have it, remove the visibility condition on the `dependency-audit` job.
5. In the branch protection rules / ruleset for `main` and ``rel/[0-9]*.[0-9]*``, add `Quality Gates / Quality Gate Summary` as a required status check — it fails if any gate job fails, so it is the only check you need to require from this workflow.
6. Public repos: in the same ruleset, add a **Require code scanning results** rule for CodeQL — the `sast-public-repo-codeql` job itself does not fail on findings, so without this rule CodeQL is report-only.