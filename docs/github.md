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
    - Require at least 1 approval (0 if sole maintainer)
    - Require review from Code Owners (>1 maintainter)
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

1. Enforcement status = Active
2. Match the following patterns:
  - main
3. Enable the following branch rules
  - **Require status checks to pass**
    - `Allowed Source Branch` (from `ci-source-branch.yml`) — see the notes below this ruleset
  - Require a pull request before merging
    - Methods Allowed: Merge

- Only `rel/[0-9]*.[0-9]*` branches may merge into `main` — fixes and hotfixes reach `main` through their release line (see [Fixes Across Release Lines](git.md#fixes-across-release-lines)). GitHub branch protection and rulesets can't restrict a PR's *source* branch, so [ci-source-branch.yml](../.github/workflows/ci-source-branch.yml) enforces it as a status check:
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
    - `Lint / Lint Summary` (the single gate job of `ci-lint.yml`)
    - `Quality / Quality Summary` (the single gate job of `ci-quality.yml`)
    - `Tests / Test Summary` (the single gate job of `ci-tests.yml`)
  - Require code scanning results
    - CodeQL

#### Ruleset - protected-tags

To stop a published release tag from being moved or deleted

Create a tag ruleset in **Settings** → **Ruleset** → **Rulesets** → **New ruleset** → **New tag ruleset**.

Target tags matching the following patterns:

Both tag formats are created by the Release workflow (`release.yml`) — see [Release Management](#release-management).

1. Enforcement status = Active
2. Match the following patterns:
  - template core release
    - v[0-9]*.[0-9]*.[0-9]*
    - v1.2.3
  - workspace release
    - *-v[0-9]*.[0-9]*.[0-9]*
    - apps-sample-api-v1.2.3
3. Enable the following tag rules
  - Leave **Restrict creations** off — the Release workflow (`release.yml`) creates tags with its own `GITHUB_TOKEN`.
  - Restrict updates -  A pushed tag can't be moved to another commit — release a new patch version instead.
  - Restrict deletions
  - Block force pushes

### Repository Environment

1. Create `production` and `staging` environments.
  - Settings → Environments → create New environment.
  - there is NO NEED for `development` environment as it is on local machine
2. Set up the rules:
  - Approval (only available on Github Free public repo and Githun Enterprise all repo)
    - Required reviewers: add the people or teams who may approve deploys.
    - [if > 1 maintainer] Prevent self-review: optional; stops whoever started the run from approving it.
  - Deployment branches and tags: "Selected branches and tags". This rule checks the branch a workflow is **run from** ("Use workflow from"), not a branch or tag it checks out — `deploy-cr.yml` checks its `release_ref` input itself.
    - use `main` and `rel/[0-9]*.[0-9]*`
3. Under Environment secrets, add the secrets listed in [Environment Workflow Secrets](#environment-workflow-secrets).
4. Same for Environment variables if any

### Advanced Security

Advanced Security [Configuration Page](https://github.com/settings/security_analysis)

#### Code Scanning

- On GitHub, go to Settings → Advanced Security
- Enable Dependency graph, Dependabot alerts and Secret scanning (also turn on push protection).
- Leave CodeQL **Default setup** off — code scanning is done by workflow (GitHub rejects workflow CodeQL uploads while default setup is on).

**Workflow ([ci-quality.yml](../.github/workflows/ci-quality.yml))**
- **Semgrep** (`sast-private-repo-semgrep`, private/internal repos only) — static analysis on PRs into ``rel/[0-9]*.[0-9]*``. Fails the job on findings, so it blocks `Quality Summary`. The SARIF report is kept as a build artifact, not uploaded to the Code scanning tab.
- **CodeQL** (`sast-public-repo-codeql`, public repos only) — scans `javascript-typescript` and `actions` (workflow files) with the `security-extended` query suite, `build-mode: none`.
  - Skipped on private repos (they need GitHub Code Security). If you have it, remove the `github.event.repository.visibility == 'public'` condition on the `sast-public-repo-codeql` job (and change the `sast-private-repo-semgrep` condition if you don't want both).
  - The job succeeds even when it finds issues — results go to **Security** → **Code scanning**. To block merges on findings, add a **Require code scanning results** rule (tool: CodeQL) to the ``rel/[0-9]*.[0-9]*`` ruleset — it compares against CodeQL results on the target branch itself, which this setup doesn't produce (CodeQL only runs on PRs), so it can show "Waiting for Code Scanning results"; it may also just be results still processing — refresh after the CodeQL job finishes.

This is separate from `NPM audit` job in the same workflow (checks for known CVEs in dependencies): Semgrep/CodeQL are static analysis of this repo's own source code.

#### Secret Scanning

A pushed secret can't be fully removed from GitHub — commits stay reachable by SHA, through the PR's refs, in forks and in caches — so the goal is to stop it **before** it's pushed. Layers, earliest first:

| Layer | Where | Effect |
|---|---|---|
| **gitleaks pre-commit hook** | developer machine, on `git commit` | blocks the commit — see [pre-commit hook](git.md#pre-commit-hook). Bypassable with `--no-verify`, and skipped (with a warning) if `gitleaks` isn't installed |
| **GitHub push protection** | GitHub, on `git push` | **rejects the push** for known secret formats (cloud keys, tokens, …) — the only server-side block on github.com. Enable under Settings → Advanced Security → Secret scanning → Push protection (free on public repos; private org repos need GitHub Secret Protection) |
| **Gitleaks secret scan** (Quality workflow) | CI, on PRs into ``rel/[0-9]*.[0-9]*`` | fails `Quality Summary`, so the PR can't merge — the secret is already on the PR branch on GitHub, but never reaches `rel/*` or `main` |
| **Secret scanning alerts** | GitHub, after the fact | alerts on secrets already in the repo |

If a secret does get pushed: **rotate / revoke it first** — that's the only real fix. Then, if it reached a long-lived branch, rewrite history (`git filter-repo`, needs a temporary ruleset exception for the force-push) and ask GitHub Support to purge cached views, PR refs and run garbage collection.

#### Dependabot

- Enable **Dependabot alerts** (Settings → Advanced Security → Dependabot alerts) — flags known CVEs in dependencies as they're published, complementing the `NPM audit` job in `ci-quality.yml`.
- Version-update PRs are configured in [.github/dependabot.yml](../.github/dependabot.yml) and need no setting — what they cover and how they fit with the on-demand update commands: [housekeeping.md](housekeeping.md#automated-dependabot).

---

### Workflows

Every workflow in [.github/workflows](../.github/workflows) — this table is the single source of truth for what exists, how it's triggered and which check to require. Names in the Actions sidebar come from each file's `name:`.

| Workflow | Trigger | What it does | Required check |
|---|---|---|---|
| [ci.yml](../.github/workflows/ci.yml) | PR into any branch except `main` | CI entry point (owns triggers + concurrency): runs Lint on every PR; for PRs into `rel/x.y` also Tests and Quality, in parallel once Lint passes — see [CI](#ci) | — (its jobs report the checks below) |
| [ci-lint.yml](../.github/workflows/ci-lint.yml) | called by `ci.yml` (`workflow_call`) | commit message format, Biome (whole repo), workflow YAML (prettier + actionlint) — see [Lint Checks](#lint-checks) | `Lint / Lint Summary` (rel/x.y) |
| [ci-tests.yml](../.github/workflows/ci-tests.yml) | called by `ci.yml` (`workflow_call`) | schema, unit and integration tests in every workspace that has the script — **currently disabled** (`if: false`), e2e commented out | `Tests / Test Summary` (rel/x.y) |
| [ci-quality.yml](../.github/workflows/ci-quality.yml) | called by `ci.yml` (`workflow_call`) | Gitleaks, npm audit, dependency review, SAST (CodeQL public / Semgrep private), coverage (Codecov), jscpd — see [Quality Workflow](#quality-workflow) | `Quality / Quality Summary` (rel/x.y) |
| [ci-pr-title.yml](../.github/workflows/ci-pr-title.yml) | PR into `rel/x.y` (opened / edited / synchronized / reopened) | PR title must follow Conventional Commits — it becomes the squash commit git-cliff reads; standalone so a title edit re-runs only this check | `PR Title Format` (rel/x.y) |
| [ci-source-branch.yml](../.github/workflows/ci-source-branch.yml) | PR into `main` (incl. retargeted) | only `rel/x.y` branches from this repo may merge into `main` — see [protected-branches-main](#ruleset---protected-branches-main) | `Allowed Source Branch` (main) |
| [release.yml](../.github/workflows/release.yml) | manual, from a `rel/x.y` branch | computes the next version + notes with git-cliff, creates the tag and GitHub release — see [Release Management](#release-management) | — |
| [deploy-cr.yml](../.github/workflows/deploy-cr.yml) | manual, pick `environment` (staging / production) | build an app image from `release_ref` and push it to a container registry. `release_ref` must be a `rel/x.y` branch or a release tag (`v1.2.3`, `<ws>-v1.2.3`) — checked before approval; then waits for approval if that environment has required reviewers | — |
| [deploy-sae.yml](../.github/workflows/deploy-sae.yml) | manual | deploy a pushed image to an Alibaba Cloud SAE application | — |
| [deploy-npm.yml](../.github/workflows/deploy-npm.yml) | manual | publish a workspace package to npm | — |
| [deploy-bucket.yml](../.github/workflows/deploy-bucket.yml) | manual | build a Vue frontend and upload it to an object-storage bucket | — |
| [update-template.yml](../.github/workflows/update-template.yml) | manual | sync upstream template changes into a `chore/sync-upstream` branch for review — see [Sync Upstream Template](#sync-upstream-template) | — |
| [maintenance.yml](../.github/workflows/maintenance.yml) | manual | delete old workflow artifacts | — |

Secrets and variables each workflow uses are listed in [Secrets And Variables](#secrets-and-variables) — keep that file in sync when a workflow adds or drops a `secrets.*` / `vars.*` reference. Secrets must never be stored in the repo.

### CI

The PR pipeline: `ci.yml` → Lint → (PRs into `rel/x.y` only) Tests + Quality, plus the standalone `ci-pr-title.yml` and `ci-source-branch.yml` checks — all listed in [Workflows](#workflows). Tests and Quality only run once Lint passes.

Changes to `.github/` can go in the same PR as other code. Review of them is enforced by [CODEOWNERS](../.github/CODEOWNERS) (`/.github/` entry) — enable **Require review from Code Owners** in the branch protection rules / ruleset for `main` and `rel/[0-9]*.[0-9]*`.

The configured branch protection rules apply uniformly to release-line branches (`rel/[0-9]*.[0-9]*`), the stable branch (`main`), and release tags (`v[0-9]*.[0-9]*.[0-9]*`, `*-v[0-9]*.[0-9]*.[0-9]*`).

#### CI Workflow

1. PR submitted to a release-line branch (`rel/x.y`)
2. CI runs on PR submitted
  - format + lint check (Biome) and commit message check — in [ci-lint.yml](../.github/workflows/ci-lint.yml), called from [ci.yml](../.github/workflows/ci.yml) on every branch except `main`
  - repo-wide schema check, no autofix
  - testing of all workspaces, no autofix
  - repo-wide package audit (`NPM audit`), no autofix
3. Only allow merge if all checks pass and approvals are met

PRs into `main` skip this CI: only `rel/x.y` may merge into `main` (`Allowed Source Branch`), and everything on `rel/x.y` already passed these checks on its own PR. Trade-offs accepted: the `rel` → `main` merge result isn't re-tested (it only differs from `rel/x.y` by patch merges already applied there), and `npm audit` doesn't re-run for CVEs published since the last `rel` PR (Dependabot alerts still flag those).

> **Note:** tests (unit, integration) run in every workspace that has the matching npm script (`npm run <script> --workspaces --if-present`); others are skipped. The e2e job is commented out for now.

#### Lint Checks

[ci.yml](../.github/workflows/ci.yml) runs on **pull requests only**, into any branch **except `main`**, with no change-scope detection. There's no push trigger: the local hooks already lint before each commit, and a push to a branch with an open PR would otherwise run everything twice — open a draft PR for CI feedback before review. It owns the triggers and concurrency; the lint jobs themselves live in the reusable [ci-lint.yml](../.github/workflows/ci-lint.yml) (`on: workflow_call`), called as job `lint` (name `Lint`) — so every check below is reported as `Lint / <job name>`:

- **Commit Message Format** — every commit in the PR must follow Conventional Commits (`feat|fix|chore`).
- **Biome Checks** — `biome ci .` on the whole repository.
- **Lint Workflow YAML** — `prettier --check` on `.github/workflows/*.yml` and `.github/actions/**/*.yml`, then `actionlint` (with shellcheck for `run:` scripts) on `.github/workflows/*.yml`. Drafts in `.github/workflows/todo/` are skipped (GitHub does not run workflows in subfolders). Known false positives are ignored in [.github/actionlint.yaml](../.github/actionlint.yaml). Check locally with `npm run ci:lint-yml`; fix with `npx prettier --write ".github/workflows/*.yml" ".github/actions/**/*.yml"` (prettier is a pinned root devDependency).
- **Lint Summary** (`Lint / Lint Summary`) — the single required check for lint: fails if any job above fails or is cancelled. Add new lint jobs to `ci-lint.yml` and to its `needs:`.

Renaming the `lint` job's `name:` in `ci.yml` changes the prefix of every lint check — update the `protected-branches-release` ruleset to match, or PRs wait on a check name that never reports.


#### Quality Workflow

[ci-quality.yml](../.github/workflows/ci-quality.yml) is called by `ci.yml` after lint passes, on PRs into ``rel/[0-9]*.[0-9]*`` only:

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
5. In the ``rel/[0-9]*.[0-9]*`` ruleset (not the one covering `main` — it doesn't run there), add `Quality / Quality Summary` as a required status check — it fails if any gate job fails, so it is the only check you need to require from this workflow.
6. Public repos: in the same ruleset, add a **Require code scanning results** rule for CodeQL — the `sast-public-repo-codeql` job itself does not fail on findings, so without this rule CodeQL is report-only.

---

### Release Management

Releases are cut manually by the Release workflow [.github/workflows/release.yml](../.github/workflows/release.yml). It uses [git-cliff](https://git-cliff.org) ([cliff.toml](../cliff.toml)) to work out the next version and release notes from Conventional Commits, then creates the tag and a GitHub release. Tests are not re-run — branch protection already requires PR checks to pass before merge.

- **Tags are the source of truth for versions.** Nothing is committed back to the branch (no version bump in `package.json`, no `CHANGELOG.md`), so the workflow needs no branch-protection bypass, GitHub App or PAT — its own `GITHUB_TOKEN` is enough.
- Run it from a `rel/<major>.<minor>` branch (e.g. `rel/1.0`); any other branch, including `main`, fails fast.
- Troubleshooting lives in [release-troubleshooting.md](./release-troubleshooting.md).

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

---

### Sync Upstream Template

Downstream repos created from this template pull in template updates with the [update-template.yml](../.github/workflows/update-template.yml) workflow (Actions → **Sync Upstream Template** → Run workflow). This section is the single source of truth for how the sync works and what it protects.

#### Running it

- **Inputs:** `upstream_branch` — the upstream branch to sync from (default `main`); `ref` — the downstream branch to update (default: the branch the workflow is run from, usually your active `rel/x.y`).
- **Secret:** `SYNC_TOKEN` — a PAT with `repo` + `workflow` scopes (fine-grained: Contents and Workflows read/write; no pull-request permission needed). The built-in `GITHUB_TOKEN` can't write `.github/workflows/` files. Setup steps are in the workflow's header comment; the secret is listed in [Secrets And Variables](#secrets-and-variables).
- **Result:** the workflow **force-pushes the branch `chore/sync-upstream`** and stops — it never pushes to your target branch and **does not open a PR**. Open a PR from `chore/sync-upstream` into the target `rel/x.y` yourself, review the diff, and merge it like any other PR (its CI and required checks apply). If upstream has no changes, the run ends green with an *Already up to date* notice and pushes nothing, else it commits and push to `chore/sync-upstream` branch.

#### What it does

A wholesale file copy, not a `git merge`:

1. Checks out the downstream `ref` and creates `chore/sync-upstream` from it.
2. Clones the upstream template into a scratch directory and strips `apps/`, `db/` and `.git` from it — upstream can never touch those paths.
3. Moves the protected paths (below) aside, wipes the rest of the working tree, copies the upstream tree in, then restores the protected paths. Anything upstream deleted is simply not copied back, so deletions sync too.
4. Regenerates `package-lock.json` (`npm install`) so upstream `package.json` changes are reflected.
5. If anything changed, commits it and force-pushes `chore/sync-upstream`; otherwise stops without pushing.

There's no `.gitattributes` / merge-driver setup to maintain — protection is just whatever paths the workflow moves aside and restores.

#### Protected paths

Never overwritten or deleted by the sync:

| Path | Purpose |
|---|---|
| `apps/**` | All backend and frontend apps |
| `db/**` | Database schemas, migrations and seeds |
| `.github/workflows/local-*.yml` | Downstream-only GitHub Actions workflows |
| `.github/actions/local-**` | Downstream-only composite / reusable actions |

Everything else is **template-owned** and is replaced on every sync — including root `package.json` / `package-lock.json`, `docs/`, `common/`, `scripts/` and every workflow without the `local-` prefix. Changes you make there are lost on the next sync; propose them upstream instead.

**Your own workflows and actions:** name them with the `local-` prefix — workflows as `local-deploy.yml`, actions as a folder `local-my-action/` containing `action.yml` — and they survive every sync.

**Protecting another path** (e.g. a custom `docs/` folder): edit the `Apply upstream` step in `update-template.yml` and add it to both the "pull aside" and the "restore" blocks, the same way `apps` / `db` are handled:

```bash
# pull aside, before the wipe
[ -d docs ] && mv docs /tmp/protected/docs

# restore, after upstream is copied in
[ -d /tmp/protected/docs ] && rm -rf docs && mv /tmp/protected/docs docs
```

Note this edit is itself in a template-owned file, so the next sync replaces it — keep a copy, or ask for the path to be protected upstream.

---

### Secrets And Variables

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
|CODECOV_TOKEN|ci-quality|optional - if not set, the Codecov upload is skipped; unit tests still run|
|GITLEAKS_LICENSE|ci-quality|optional - if not set, the Gitleaks secret scan is skipped; Gitleaks itself requires a license for repos owned by a GitHub organization|
|GITHUB_TOKEN|ci-quality,deploy-bucket,release|provided automatically by GitHub|
|SEMGREP_APP_TOKEN|ci-quality|optional - only for the commented-out paid Semgrep step; not needed by default|

#### Repository Workflow Variables

|Vars|Workflow|Use|
|----|--------|---|
|ENDPOINT|deploy-bucket|Alibaba Cloud OSS endpoint, e.g. oss-ap-southeast-1.aliyuncs.com. Used by both the ossutil job and the AWS CLI job|
|CR_HOST|deploy-cr|Container registry host.|
|CR_HOST_VPC|deploy-sae|Container registry host VPC.|
|CR_IMAGENAME|deploy-cr,deploy-sae|Image name. Defaults to the repo name|
|CR_NAMESPACE|deploy-cr,deploy-sae|Container registry namespace|
|SAE_APP_ID|deploy-sae|SAE application ID. A workflow input can override it|
|SAE_REGION|deploy-sae|SAE region. Defaults to ap-southeast-1|
|SAE_ACR_INSTANCE_ID|deploy-sae|ACR Enterprise instance ID. Only needed if the image is in ACR Enterprise Edition|
