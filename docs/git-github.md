## Hooks Setup And Usage

- Pre-commit runs Biome checks on affected directories and schema validation tests where applicable.
- Commit-msg validates the message against Conventional Commits (`feat`, `fix`, `chore` only).
- Pre-push runs workspace tests and schema validation checks.
- `npm install` also runs `npm prepare`, which configures the hooks path automatically.
To skip hooks temporarily:
```bash
git commit --no-verify
git push --no-verify
```


This repository uses native Git hooks in `.githooks/`.

After cloning, activate the hooks by

**OPTION 1 - Running Setup Script**

```bash
# Make the setup script executable and run it
chmod +x .githooks/setup.sh
./.githooks/setup.sh
```

**OPTION 2 - Manual Installation**

```bash
# remove hooks path
git config --local --unset-all core.hooksPath

# set hooks path explicitly
git config --local core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push
```

**OPTION 3 - Via NPM prepare script**

Running `npm install` will also run `npm prepare`, which configures the hooks path automatically.


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
| **Unit tests** | Runs `npm run test --workspace=<ws>` for each touched workspace (`apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`) that has a `test` script. |
| **Schema validation tests** | Runs `npm run test:schemas` for `common/schemas` and every `apps/*/schemas` directory (touched or not), if the root script exists. |
| **Security audit** | Runs `npm audit --omit=dev --audit-level=moderate`; on findings, prompts `y/n` to continue the push. |

To skip the pre-push hook temporarily:
```bash
git push --no-verify
```

---

## Branching And Protection

### Branch tags used

- <feat/fix/chore>/scope/<...>
- rel/<current release version>, rel/<next release version>
  - can add -rc.1, -beta.1 suffixes as needed
- hotfix/<scope>/<...>
- v<version> (root tag), <path-with-dashes>-v<version> (workspace tag, e.g. `apps-sample-api-v1.2.3`)
- main

Examples:
- release branch: rel/1.1
- patch tags: v1.1.1
- beta release: rel/1.1-beta.4

### Branch & Tag Summary & Flow

Use the table below to find out how to name branches based on action taken. Usually, contributors will create feat/fix/chore based off a `rel` branch

| Branch | Branch from | Merge to | Notes |
|---|---|---|---|
| `rel/1.0` | `main` | `main` when production ready | Active dev branch |
| `feat/fix/chore` | `rel/1.0` | `rel/1.0` via PR | Day-to-day work |
| `hotfix/scope/name` | `main` | `main` + `rel/1.0` + `rel/2.0` | Emergency only |
| `tag: v1.0.0` | `rel/1.0` after merge to main | — | Full release tag |
| `tag: v1.0.1` | `rel/1.0` after hotfix merges in | — | Patch tag only, no merge back to main |
| `rel/2.0` | `main` after `v1.0.0` tag | `main` when ready | Next dev cycle, cut from stable tag |

The consistent rule is: **tags always come from `rel/[0-9]*.[0-9]*`**, never directly from `main`. Main is the destination, not the source of truth for what shipped.

### Hotfix & Backport Flow

```
hotfix/payment-crash (check out from main)
  → merge to main (keeps main stable)
  → merge to rel/1.0
      → tag v1.0.1 here (patch tag on rel/1.0)
      → DO NOT DO THIS! DANGEROUS! merge rel/1.0 to main (main now has the patch)
  → cherry-pick to rel/2.0 (backport)
```

### Branch Protection Rules

Edit branch protection rules in **Settings** → **Branches** → **Add branch protection rule** to prevent merges when CI checks fail.

Match the following patterns:

|Type|Pattern|
|----|-------|
|stable|`main`|
|release|`rel/[0-9]*.[0-9]*`|

For each pattern, enable:

| Setting | Action |
|---------|--------|
| **Require a pull request before merging** | Enable. Require 1 approval. Dismiss stale approvals on new commits. |
| **Require review from Code Owners** | Enable. Changes under `.github/` need approval from the owners in [CODEOWNERS](../.github/CODEOWNERS). |
| **Require status checks to pass** | Enable. Require branches to be up to date. |
| | Add required checks: `Commit Message Format` and `Biome Checks` (from `ci-lint.yml`), `Quality Gates / Quality Gate Summary`, `Tests / Schema Validation Tests`, `Tests / Unit Tests`, `Tests / Integration Tests`, `Tests / E2E Tests` (the last four are from `ci-tests.yml`, which is **currently disabled** — a skipped job reports as passing, so they don't block anything until it's re-enabled). `ci-tests.yml` and `ci-quality-gates.yml` are called from `ci-lint.yml`, so their checks are prefixed with the calling job's name |
| **Require conversation resolution before merging** | Enable. |
| **Include administrators** | Enable. Prevents bypass by repo admins. |

### Tag Rulesets

Branch protection rules don't apply to tags. To stop a published release tag from being moved or deleted, add a tag ruleset in **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New tag ruleset**.

Target tags matching the following patterns:

|Type|Pattern|Example|
|----|-------|-------|
|template core release|`v[0-9]*.[0-9]*.[0-9]*`|`v1.2.3`|
|workspace release|`*-v[0-9]*.[0-9]*.[0-9]*`|`apps-sample-api-v1.2.3`|

Both tag formats are created by the `Release` workflow — see [Release Automation](#release-automation).

Enable:

| Setting | Action |
|---------|--------|
| **Enforcement status** | Active. |
| **Restrict updates** | Enable. A pushed tag can't be moved to another commit — release a new patch version instead. |
| **Restrict deletions** | Enable. |

Leave **Restrict creations** off — the `Release` workflow creates tags with its own `GITHUB_TOKEN`.

### Repository Environment

1. Settings → Environments → production (choose New environment if it doesn't exist yet).
2. Under Environment secrets, add the secrets listed in [Environment Workflow Secrets](secrets-vars.md#environment-workflow-secrets).
3. On the same page, set up the rules:
  - Required reviewers: add the people or teams who may approve deploys.
  - Prevent self-review: optional; stops whoever started the run from approving it.
  - Deployment branches and tags: "Selected branches and tags", for example main and rel/*.

### Code Scanning

**Advanced Security**
- On GitHub, go to Settings → Advanced Security
- Enable Dependency graph, Dependabot alerts and Secret scanning (also turn on push protection).
- Leave CodeQL **Default setup** off — code scanning is done by workflow (GitHub rejects workflow CodeQL uploads while default setup is on).

**Workflow ([ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml))**
- **Semgrep** (`sast-private-repo-semgrep`, private/internal repos only) — static analysis on PRs and pushes to `main` and ``rel/[0-9]*.[0-9]*``. Fails the job on findings, so it blocks `Quality Gate Summary`. The SARIF report is kept as a build artifact, not uploaded to the Code scanning tab.
- **CodeQL** (`sast-public-repo-codeql`, public repos only) — scans `javascript-typescript`, `python` and `actions` (workflow files) with the `security-extended` query suite, `build-mode: none`.
  - Skipped on private repos (they need GitHub Code Security). If you have it, remove the `github.event.repository.visibility == 'public'` condition on the `sast-public-repo-codeql` job (and change the `sast-private-repo-semgrep` condition if you don't want both).
  - The job succeeds even when it finds issues — results go to **Security** → **Code scanning**. To block merges on findings, add a **Require code scanning results** rule (tool: CodeQL) to the ruleset for `main` and ``rel/[0-9]*.[0-9]*``.

This is separate from the `NPM audit` job in the same workflow: Semgrep/CodeQL are static analysis of this repo's own source code, `npm audit` checks for known CVEs in dependencies. Keep both.

### Dependabot

Version-update PRs are already configured in [.github/dependabot.yml](../.github/dependabot.yml):

- `npm` — root directory (covers all workspaces: `apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`)
- `github-actions` — `/` for workflow files plus `.github/actions/*` for composite actions (e.g. `checkout`, `setup-node-npm-install`)

Both run weekly and need no workflow file — GitHub schedules them itself.

Separately, enable **Dependabot alerts** via **Settings** → **Advanced Security** → **Dependabot alerts** — this flags known CVEs in dependencies as they're published, complementing (not replacing) the `NPM audit` job in `ci-quality-gates.yml`.

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

## Release Automation

Releases are cut manually by the `Release` workflow ([.github/workflows/release.yml](../.github/workflows/release.yml), `workflow_dispatch`). It uses [git-cliff](https://git-cliff.org) ([cliff.toml](../cliff.toml)) to work out the next version and the release notes from Conventional Commits, then creates the tag and a GitHub release. Tests are not re-run — branch protection already requires PR checks to pass before merge.

- **Tags are the source of truth for versions.** Nothing is committed back to the branch (no version bump in `package.json`, no `CHANGELOG.md`), so the workflow needs no branch-protection bypass, GitHub App or PAT — its own `GITHUB_TOKEN` is enough.
- Run it from a `rel/<major>.<minor>` branch (e.g. `rel/1.0`); any other branch, including `main`, fails fast.
- Troubleshooting lives in [release-troubleshooting.md](./release-troubleshooting.md).

### Components and tags

| `workspace` input | Tag | Commits considered |
|---|---|---|
| `.` (default) | `v1.2.3` | all commits — the template core; marked as the repo's "Latest" release |
| `apps/sample-api` (any workspace path) | `apps-sample-api-v1.2.3` | only commits touching that path |

A component's **first** release (no matching tag yet) uses the version already in its `package.json` as-is. Set that version before the first run if it isn't what you want.

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
- Open those PRs from `feat/*`, `fix/*`, or `chore/*` into the active `rel/[0-9]*.[0-9]*` branch.
- Reserve `hotfix/*` branches for urgent fixes that start from `main`, merge to `main`, and are then backported to active `rel/[0-9]*.[0-9]*` branches.
- Use cherry-pick for hotfix backports when the same fix must land in multiple release branches.

This keeps the commit history git-cliff reads clean and matches the contributor workflow in [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md).

---

## CI

Please read the following scripts for information on the CI workflows

1. Lint workflow [ci-lint.yml](../.github/workflows/ci-lint.yml) — commit messages, Biome, workflow YAML
2. Tests workflow [ci-tests.yml](../.github/workflows/ci-tests.yml) — schema, unit, integration, e2e (**currently disabled**: every job is gated `if: false && …`)
3. Quality gates workflow [ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml) — security scans, coverage, duplication

`ci-lint.yml` is the only workflow with its own triggers. Once all its lint jobs pass, it calls `ci-tests.yml` and `ci-quality-gates.yml` (reusable workflows, `on: workflow_call`) in parallel, for PRs into and pushes to `main` and ``rel/[0-9]*.[0-9]*``. If lint fails, neither runs — their required checks stay pending, so the PR is still blocked.

Changes to `.github/` can go in the same PR as other code. Review of them is enforced by [CODEOWNERS](../.github/CODEOWNERS) (`/.github/` entry) — enable **Require review from Code Owners** in the branch protection rules / ruleset for `main` and ``rel/[0-9]*.[0-9]*``.

Once configured:
- PRs show red X if any required check fails.
- Merges are blocked until all checks pass and approvals are met.
- The branch protection rules apply uniformly across day-to-day work (`rel/[0-9]*.[0-9]*` branches), production merges (`main`), and emergency hotfixes.

> **Note:** tests (unit, integration, e2e) are run for touched workspaces only, identified by the `detect-touched-workspaces` action; a workspace without the matching npm script is skipped. Integration and E2E tests run on `pull_request` only, not on push.

### CI Workflow

1. PR submitted to main or release branches
2. CI runs on PR submitted
  - format + lint check (Biome) and commit message check — in [ci-lint.yml](../.github/workflows/ci-lint.yml), on every branch
  - repo-wide schema check, no autofix
  - testing of touched workspaces, no autofix
  - repo-wide package audit (`npm audit`), no autofix
3. Only allow merge if all checks pass

### Lint Workflow

[ci-lint.yml](../.github/workflows/ci-lint.yml) runs on PRs and pushes on **every** branch, with no change-scope detection:

- **Commit Message Format** — every commit in the PR / push must follow Conventional Commits (`feat|fix|chore`).
- **Biome Checks** — `biome ci` on touched workspaces only (the first push of a new branch checks everything).
- **Lint Workflow YAML** — `prettier --check` on `.github/workflows/*.yml` and `.github/actions/**/*.yml`, then `actionlint` (with shellcheck for `run:` scripts) on `.github/workflows/*.yml`. Drafts in `.github/workflows/todo/` are skipped (GitHub does not run workflows in subfolders). Known false positives are ignored in [.github/actionlint.yaml](../.github/actionlint.yaml). Check locally with `npm run quality:lint`; fix with `npx prettier --write ".github/workflows/*.yml" ".github/actions/**/*.yml"` (prettier is a pinned root devDependency).

A push to a branch with an open PR triggers both a push and a PR run.

### Quality Gates Workflow

[ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml) is called by `ci-lint.yml` after lint passes, on PRs and pushes to `main` and ``rel/[0-9]*.[0-9]*``:

- **Gitleaks secret scan** — scans the git history for committed secrets.
- **NPM audit** — `npm audit --omit=dev --audit-level=moderate` against the root lockfile (all workspaces).
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