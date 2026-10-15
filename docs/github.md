## Github Repo Setup

### Rulesets

Create the following Rulesets for branch and tag protection

#### Ruleset - protected-branches-all

To prevent merges or pushes under certain conditions.

Create branch rulesets: **Settings** → **Rulesets** → **Rulesets** → **New Ruleset** → **New branch ruleset**.

- Enforcement status = Active
- Match the following patterns:
  - main
  - rel/[0-9]*.[0-9]*
- Enable the following branch rules
  - Restrict deletions
  - **Require a pull request before merging**
    - Require at least 1 approval (0 if sole maintainer)
    - Require review from Code Owners (>1 maintainer)
    - Dismiss stale approvals on new commits
    - Require conversation resolution before merging
    - Methods Allowed: Select ALL
  - **Require status checks to pass**
    - **DISABLE** Require branches to be up to date before merging — see [Why "up to date" is off](#why-up-to-date-is-off)
    - **No required checks here.** `ci.yml` (and the Tests / Quality it calls) doesn't run on PRs into `main`, and a workflow skipped by a branch filter never reports — a check required here would leave every PR into `main` waiting forever. The CI checks are required in `protected-branches-release` instead; `main` only requires `Allowed Source Branch` (in `protected-branches-main`).
  - Block force pushes

##### Why "up to date" is off

With it on, a PR whose base has moved on ("This branch is out-of-date with the base branch") can't merge until the base is merged into the head branch (**Update branch**). That conflicts with this repo's flow:

- **`rel/x.y` → `main` would block every release after the first.** Merging `rel/1.0` into `main` creates a merge commit that exists only on `main`, so the next `rel/1.0` → `main` PR is out of date — and **Update branch** would have to push `main` into `rel/1.0`, which the ruleset forbids (PR-only).
- **It breaks the single-branch fix / hotfix flow.** A `fix/*` or `hotfix/*` branch for several release lines starts at the commit they share, so its PRs into newer `rel/*` branches are almost always out of date. Updating one merges that whole `rel` branch into the *shared* branch, and the PR into the production line would then ship it — see [Fixes Across Release Lines](git.md#fixes-across-release-lines).

Little is lost: `pull_request` checks already run against a test merge of the head and the base as it was when the run started. What's dropped is a forced re-run when the base moved after that; on a small team, base-branch CI catches the rare pair of PRs that pass alone but break together. If you need that guarantee later, use GitHub's **merge queue** instead (organization-owned repos; workflows need an `on: merge_group:` trigger) — it tests the merged result without touching the head branch.

**Sole maintainer:** GitHub never lets a PR's author approve it, so set required approvals to `0` and turn off **Require review from Code Owners** (if you're the only code owner) — every other rule and required check stays enforced. Switch back to 1 approval + Code Owners once there's a second reviewer. Don't add yourself to the bypass list instead: bypass skips *every* rule in the ruleset, including required checks.


#### Ruleset - protected-branches-main

- Enforcement status = Active
- Match the following patterns:
  - `main`
- Enable the following branch rules
  - **Require status checks to pass**
    - `Allowed Source Branch` from [ci-source-branch.yml](../.github/workflows/ci-source-branch.yml)
      - Only `rel/<major>.<minor>` branches may merge into `main`
      - Runs on every PR into `main` (`opened`, `synchronize`, `reopened`, `edited` — the last catches a PR retargeted to `main` after it was opened).
      - GitHub branch protection and rulesets can't restrict a PR's *source* branch, so enforces it as a status check
      - Fork PRs fail outright — a fork can name its branch `rel/1.0`, so only branches in this repository count.
  - Require a pull request before merging
    - Methods Allowed: Merge

#### Ruleset - protected-branches-release

- Enforcement status = Active
- Match the following patterns:
  - rel/[0-9]*.[0-9]*
- Enable the following branch rules
  - Require a pull request before merging
    - Methods Allowed: Squash
  - Require status checks to pass
    - every check marked `(rel/x.y)` in the **Required check** column of [Workflows](#workflows)
  - Require code scanning results
    - CodeQL
    - on public repo, `sast-public-repo-codeql` job itself does not fail on findings, so without this rule CodeQL is report-only.


#### Ruleset - protected-tags

Create tag ruleset in **Settings** → **Ruleset** → **Rulesets** → **New ruleset** → **New tag ruleset**.

Target tags matching the following patterns:

Both tag formats are created by the Release workflow (`release.yml`) — see [Release Management](#release-management).

- Enforcement status = Active
- Match the following patterns:
  - v[0-9]*.[0-9]*.[0-9]* (template core release, example v1.2.3)
  - *-v[0-9]*.[0-9]*.[0-9]* (workspace release, example apps-sample-api-v1.2.3)
- Enable the following tag rules
  - Leave **Restrict creations** off — the Release workflow (`release.yml`) creates tags with its own `GITHUB_TOKEN`.
  - Restrict updates -  A pushed tag can't be moved to another commit — release a new patch version instead.
  - Restrict deletions - published release tag cannot be deleted
  - Block force pushes

### Repository Environment

- Create `production` and `staging` environments.
  - Settings → Environments → create New environment.
  - there is NO NEED for `development` environment as it is on local machine
- Set up the rules:
  - Approval (only available on Github Free public repo and Githun Enterprise all repo)
    - Required reviewers: add the people or teams who may approve deploys.
    - [if > 1 maintainer] Prevent self-review: optional; stops whoever started the run from approving it.
  - Deployment branches and tags: "Selected branches and tags". This rule checks the branch a workflow is **run from** ("Use workflow from"), not a branch or tag it checks out — `deploy-cr.yml` checks its `release_ref` input itself.
    - use `main` and `rel/[0-9]*.[0-9]*`
- Under Environment secrets, add the secrets listed in [Environment Workflow Secrets](#environment-workflow-secrets).
- Same for Environment variables if any

### Advanced Security

Advanced Security [Configuration Page](https://github.com/settings/security_analysis)

#### Code Scanning

- On GitHub, go to Settings → Advanced Security
- Enable Dependency graph, Dependabot alerts and Secret scanning (also turn on push protection).
- Leave CodeQL **Default setup** off — code scanning is done by workflow (GitHub rejects workflow CodeQL uploads while default setup is on).

**Workflow ([ci-quality.yml](../.github/workflows/ci-quality.yml))**
- **Semgrep** (`sast-private-repo-semgrep`, private/internal repos only) — static analysis on PRs into ``rel/[0-9]*.[0-9]*``. Fails the job on findings, so it blocks `Quality Summary`. The SARIF report is kept as a build artifact, not uploaded to the Code scanning tab.
- **CodeQL** (`sast-public-repo-codeql`, public repos only) — scans `javascript-typescript` and `actions` (workflow files) with the `security-extended` query suite, `build-mode: none`.
  - Rule exclusions live in [.github/codeql/codeql-config.yml](../.github/codeql/codeql-config.yml), passed to the init step as `config-file:`. Currently excluded: `js/missing-rate-limiting` (rate limiting is expected at the gateway/load balancer — confirm for your deployment) and `js/missing-token-validation` (CSRF — mitigated only by the auth cookies' `sameSite: "lax"`, so never set `COOKIE_OPTS.sameSite` to `"none"` and never change state on a GET route; add a CSRF check before using cookie auth across sites).
  - Skipped on private repos (they need GitHub Code Security). If you have it, remove the `github.event.repository.visibility == 'public'` condition on the `sast-public-repo-codeql` job (and change the `sast-private-repo-semgrep` condition if you don't want both).
  - The job succeeds even when it finds issues — results go to **Security** → **Code scanning**. Merges are blocked on findings by the **Require code scanning results** rule in [protected-branches-release](#ruleset---protected-branches-release).

#### Secret Scanning

A pushed secret can't be fully removed from GitHub — commits stay reachable by SHA, through the PR's refs, in forks and in caches — so the goal is to stop it **before** it's pushed. Layers, earliest first:

| Layer | Where | Effect |
|---|---|---|
| **secretlint pre-commit hook** | developer machine, on `git commit` | blocks the commit — see [pre-commit hook](git.md#pre-commit-hook). Bypassable with `--no-verify`, and skipped (with a warning) if `npm install` hasn't been run |
| **GitHub push protection** | GitHub, on `git push` | **rejects the push** for known secret formats (cloud keys, tokens, …) — the only server-side block on github.com. Enable under Settings → Advanced Security → Secret scanning → Push protection (free on public repos; private org repos need GitHub Secret Protection) |
| **Gitleaks secret scan** (Quality workflow) | CI, on PRs into ``rel/[0-9]*.[0-9]*`` | fails `Quality Summary`, so the PR can't merge — the secret is already on the PR branch on GitHub, but never reaches `rel/*` or `main` |
| **Secret scanning alerts** | GitHub, after the fact | alerts on secrets already in the repo |

If a secret does get pushed: **rotate / revoke it first** — that's the only real fix.

#### Dependabot

- Enable **Dependabot alerts** (Settings → Advanced Security → Dependabot alerts) — flags known CVEs in dependencies as they're published, complementing the `NPM audit` job in `ci-quality.yml`.
- Version-update PRs are configured in [.github/dependabot.yml](../.github/dependabot.yml) and need no setting — what they cover and how they fit with the on-demand update commands: [housekeeping.md](housekeeping.md#automated-dependabot).

---

### Workflows

Every workflow in [.github/workflows](../.github/workflows) — this table is the single source of truth for what exists, how it's triggered and which check to require. Names in the Actions sidebar come from each file's `name:`.

| Workflow | Trigger | What it does | Required check |
|---|---|---|---|
| [ci.yml](../.github/workflows/ci.yml) | PR into any branch except `main` | CI entry point (owns triggers + concurrency): runs Lint on every PR; for PRs into `rel/x.y` also Tests and Quality, in parallel once Lint passes — see [CI](#ci) | — (its jobs report the checks below) |
| [ci-lint.yml](../.github/workflows/ci-lint.yml) | called by `ci.yml` (`workflow_call`) | commit message format, Biome (whole repo), TypeScript type check (`tsc --noEmit`), workflow YAML (prettier + actionlint), as steps of one job | `Lint / Lint Check` (rel/x.y) |
| [ci-tests.yml](../.github/workflows/ci-tests.yml) | called by `ci.yml` (`workflow_call`) | schema, unit (with coverage → Codecov) and integration tests, as steps of one job — schema and integration **currently disabled** (`false &&`), e2e commented out | `Tests / Test Check` (rel/x.y) |
| [ci-quality.yml](../.github/workflows/ci-quality.yml) | called by `ci.yml` (`workflow_call`) | Gitleaks, npm audit, dependency review, SAST (CodeQL public / Semgrep private), jscpd | `Quality / Quality Summary` (rel/x.y) |
| [ci-pr-title.yml](../.github/workflows/ci-pr-title.yml) | PR into `rel/x.y` (opened / edited / synchronized / reopened) | PR title must follow Conventional Commits — it becomes the squash commit git-cliff reads; standalone so a title edit re-runs only this check | `PR Title Format` (rel/x.y) |
| [ci-source-branch.yml](../.github/workflows/ci-source-branch.yml) | PR into `main` (incl. retargeted) | only `rel/x.y` branches from this repo may merge into `main` — see [protected-branches-main](#ruleset---protected-branches-main) | `Allowed Source Branch` (main) |
| [release.yml](../.github/workflows/release.yml) | manual, from a `rel/x.y` branch | computes the next version + notes with git-cliff, creates the tag and GitHub release — see [Release Management](#release-management) | — |
| [deploy-cr.yml](../.github/workflows/deploy-cr.yml) | manual, pick `environment` (staging / production) | build an app image from `release_ref` and push it to a container registry. `release_ref` must be a `rel/x.y` branch or a release tag (`v1.2.3`, `<workspace-path>-v1.2.3`) — checked before approval; then waits for approval if that environment has required reviewers | — |
| [deploy-sae.yml](../.github/workflows/deploy-sae.yml) | manual | deploy a pushed image to an Alibaba Cloud SAE application | — |
| [deploy-npm.yml](../.github/workflows/deploy-npm.yml) | manual | publish a workspace package to npm | — |
| [deploy-bucket.yml](../.github/workflows/deploy-bucket.yml) | manual | build a Vue frontend and upload it to an object-storage bucket | — |
| [update-template.yml](../.github/workflows/update-template.yml) | manual | sync upstream template changes into a `chore/sync-upstream` branch for review — see [Sync Upstream Template](#sync-upstream-template) | — |
| [maintenance.yml](../.github/workflows/maintenance.yml) | manual | delete old workflow artifacts | — |

Secrets and variables each workflow uses are listed in [Repo Secrets And Variables](#repo-secrets-and-variables) — keep that section in sync when a workflow adds or drops a `secrets.*` / `vars.*` reference. Secrets must never be stored in the repo.

### CI

PR submitted to `main` branch

- Triggers [`Allowed Source Branch Workflow`](../.github/workflows/ci-source-branch.yml)
  - All required checks are passed in PR to `rel/*` branches
  - Dependabot still flag CVE alerts

PR submitted to a release-line branch  (`rel/x.y`)

- Triggers [`CI Workflow`](../.github/workflows/ci.yml)
  - calls [`Lint Workflow`](../.github/workflows/ci-lint.yml)
    - refer to workflow file for details
  - calls [`Quality Workflow`](../.github/workflows/ci-quality.yml) if `Lint Workflow` passes
    - refer to workflow file for details
    - TODO Setup: Create as Actions secret `GITLEAKS_LICENSE`. For GitHub **organization** repo, get free license key from [gitleaks.io](https://gitleaks.io/). For **personal** repo, set as any value to enable scan. Every Gitleaks step is gated on this secret, so **without it the scan is skipped on any repo**.
    - `dependency-review-action` needs the **Dependency graph** (enabled in [Code Scanning](#code-scanning)). On private repos the job is skipped (it needs GitHub Code Security); if you have it, remove the visibility condition on the `dependency-audit` job.
  - calls [`Tests Workflow`](../.github/workflows/ci-tests.yml) if `Lint Workflow` passes
    - refer to workflow file for details
    - TODO Setup:
      1. Sign in to [Codecov](https://about.codecov.io/) with GitHub and add this repository.
      2. Copy the repository upload token and add it as Actions secret `CODECOV_TOKEN` (Settings → Secrets and variables → Actions). Optional — without it the Codecov upload is skipped (unit tests still run); with it, an upload error fails the job (`fail_ci_if_error: true`).

- Recommend to open a draft PR for CI feedback before review
- Only allow merge if all checks pass and approvals are met

Changes to `.github/` can go in the same PR as other code. Review of them is enforced by [CODEOWNERS](../.github/CODEOWNERS) (`/.github/` entry) through the **Require review from Code Owners** rule in [protected-branches-all](#ruleset---protected-branches-all).


---

### Release Management

Releases are cut manually by the Release workflow [.github/workflows/release.yml](../.github/workflows/release.yml). It uses [git-cliff](https://git-cliff.org) ([cliff.toml](../cliff.toml)) to work out the next version and release notes from Conventional Commits, then creates the tag and a GitHub release. Tests are not re-run — branch protection already requires PR checks to pass before merge.

- **Tags are the source of truth for versions.** Nothing is committed back to the branch (no version bump in `package.json`, no `CHANGELOG.md`), so the workflow needs no branch-protection bypass, GitHub App or PAT — its own `GITHUB_TOKEN` is enough.
- Run it from a `rel/<major>.<minor>` branch (e.g. `rel/1.0`); any other branch, including `main`, fails fast.
- Troubleshooting: see [Troubleshooting](#troubleshooting) below.

#### Components and tags

| `workspace` input | Tag | Commits considered |
|---|---|---|
| `.` (default) | `v1.2.3` | all commits — the template core; marked as the repo's "Latest" release |
| `apps/sample-api` (any workspace path) | `apps-sample-api-v1.2.3` | only commits touching that path |

A component's **first** release (no matching tag yet) uses the version already in its `package.json` as-is.
Set that version before the first run if it isn't what you want.

#### Inputs

- `workspace` — `.` or a workspace path with a `package.json`.
- `bump` — `auto` (default) derives it from commits since the component's last tag: breaking change (`!` or `BREAKING CHANGE:` footer) → major, `feat` → minor, anything else (`fix`, `chore`) → patch. Or force `patch`/`minor`/`major`.
- `dry-run` — print the next version and notes to the job summary without creating anything.

The run fails if the computed tag already exists, i.e. there are no new commits for that component since its last release.

#### Previewing locally

```bash
npx git-cliff --tag-pattern '^v[0-9]+\.[0-9]+\.[0-9]+$' --bumped-version          # next template-core version
npx git-cliff --tag-pattern '^v[0-9]+\.[0-9]+\.[0-9]+$' --unreleased --strip all  # its release notes
# a workspace: add --include-path 'apps/sample-api/**' and use '^apps-sample-api-v[0-9]+\.[0-9]+\.[0-9]+$'
```

#### Using the version at deploy time

Because `package.json` versions aren't bumped in the repo, a deploy job that needs the version should read it from the tag it checked out, e.g. `npm version "${TAG##*v}" --no-git-tag-version --workspace=<path>` before building or publishing.

#### Troubleshooting

Tip: run with `dry-run` checked first — the job summary shows the computed tag and release notes without creating anything.

- **"Releases are only cut from rel/<major>.<minor> branches"** — dispatched from another branch. Re-run and pick the `rel/<major>.<minor>` branch in "Use workflow from".
- **"… is not a workspace with a package.json"** — `workspace` must be `.` or a repo-relative folder with a `package.json` (e.g. `apps/sample-api`; leading `./` / trailing `/` fine). Absolute paths and `..` are rejected.
- **"<tag> already exists - no new commits …"** — no commits for that component since its last tag (for a workspace, only commits touching its path count). Check the changes were merged into the branch you ran from.
- **Version not what you expected** — a first release uses `package.json` as-is (edit it, or create a baseline tag e.g. `apps-sample-api-v0.0.6` on an older commit); for `auto` see the [bump rules](#inputs) or pass `bump`; only tags matching the component's pattern count (bare `0.6.11` is ignored).
- **Commit missing from the release notes** — non-Conventional-Commit messages are skipped (git-cliff logs how many), and so is `chore(release)…`. With squash merges, check the PR title.
- **403 / "Resource not accessible by integration"** — Settings → Actions → General → Workflow permissions must allow `contents: write`; a tag ruleset restricting creation blocks `GITHUB_TOKEN` (see [protected-tags](#ruleset---protected-tags)).
- **Another workflow didn't run on release** — events from `GITHUB_TOKEN` don't trigger workflows. Dispatch the deploy workflow manually with the new tag, or call it from `release.yml` via `workflow_call`.

---

### Sync Upstream Template

Downstream repos created from this template pull in template updates with the [update-template.yml](../.github/workflows/update-template.yml) workflow (Actions → **Sync Upstream Template** → Run workflow).

Refer to the workflow script to understand what it does.

Workflow Inputs are
  - `upstream_branch` — upstream branch to sync from (default `main`).
  - `ref` — downstream branch to base on to create `chore/sync-upstream` branch.

Repo Secret required by the Workflow
  - `SYNC_TOKEN` — a PAT with `repo` + `workflow` scopes (fine-grained: Contents and Workflows read/write; no pull-request permission needed). The built-in `GITHUB_TOKEN` can't write `.github/workflows/` files. Setup steps are in the [workflow's](../.github/workflows/update-template.yml) header comment; secret is listed in [Repo Secrets And Variables](#repo-secrets-and-variables).

If upstream has no changes, the run ends with success message, else `chore/sync-upstream` branch based on the input `ref` branch is created. Use PR to merge `chore/sync-upstream` to `ref` (e.g. `rel/1.0`) branch

The following downstream paths are **NEVER** overwritten or deleted by the sync:

| Path | Purpose |
|---|---|
| `apps/**` | All backend and frontend apps |
| `db/**` | Database schemas, migrations and seeds |
| `.github/workflows/local-*.yml` | Downstream GitHub Actions workflows (`local-` file prefix) |
| `.github/actions/local-**` | Downstream-only composite / reusable actions (`local-` folder prefix) |

---

### Repo Secrets And Variables

#### Environment Workflow Secrets
|Secret|Workflow|Note|
|------|--------|----|
|DOPPLER_TOKEN|todo/ref-soc2-deploy-to-production (draft)|not used by any live workflow; the `apps/sample-api` image reads it at runtime from the deploy platform's env (e.g. SAE app config), not from GitHub|
|ACCESS_KEY_ID|deploy-bucket,deploy-sae|Alibaba Cloud RAM user with SAE deploy + OSS write permission (AWS key if using the s3 provider)|
|ACCESS_KEY_SECRET|deploy-bucket,deploy-sae|secret for ACCESS_KEY_ID|

#### Repository Workflow Secrets

|Secret|Workflow|Note|
|------|--------|----|
|CR_USERNAME|deploy-cr||
|CR_PASSWORD|deploy-cr||
|NPM_AUTH_TOKEN|deploy-npm||
|SYNC_TOKEN|update-template||
|CODECOV_TOKEN|ci-tests|optional — setup in [CI](#ci)|
|GITLEAKS_LICENSE|ci-quality|optional — setup in [CI](#ci)|
|GITHUB_TOKEN|ci-quality,deploy-bucket,release|provided automatically by GitHub|
|SEMGREP_APP_TOKEN|ci-quality|optional - only for the commented-out paid Semgrep step; not needed by default|

#### Repository Workflow Variables

|Vars|Workflow|Use|
|----|--------|---|
|ENDPOINT|deploy-bucket|Alibaba Cloud OSS endpoint, e.g. oss-ap-southeast-1.aliyuncs.com. Used by both the ossutil job and the AWS CLI job|
|CR_EE_INSTANCE_ID|deploy-sae|ACR Enterprise instance ID. Only needed if the image is in ACR Enterprise Edition|
|CR_HOST|deploy-cr|Container registry host.|
|CR_HOST_VPC|deploy-sae|Container registry host VPC.|
|CR_NAMESPACE|deploy-cr,deploy-sae|Container registry namespace|
|SAE_REGION|deploy-sae|SAE region. Defaults to ap-southeast-1|
