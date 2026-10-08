## Hooks Setup And Usage

- Pre-commit runs Biome checks on affected directories and schema validation tests where applicable.
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

**OPTION 2 - Manually Installation**

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
| **Biome format & lint** | Runs `npx biome check` on each affected directory (`common/iso`, `common/node`, `common/vue`, `common/web`, `apps`, `scripts`). Run `npm run check` to auto-fix. |
| **Schema validation tests** | Runs `npm run test:schemas -- <folder>` for each affected schema directory (`common/schema`, `common/schemas`, `apps/*/schema`, `apps/*/schemas`). |

To skip the pre-commit hook temporarily:
```bash
git commit --no-verify
```

### pre-push hook

Runs automatically on every `git push`:

| Check | Details |
|-------|---------|
| **Unit tests** | Runs `npm run test:workspaces` (or `npm test`). |
| **Schema validation tests** | Runs `npm run test:schemas` if the script exists. |

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
- hotfix/<current release version>/<...>
- tag/<patch version>
- main

Examples:
- release branch: rel/1.1
- patch tags: tag/1.1.1
- beta release: rel/1.1-beta.4

### Branch & Tag Summary & Flow

Use the table below to find out how to name branches based on action taken. Usually, contributors will create feat/fix/chore based off a `rel` branch

| Branch | Branch from | Merge to | Notes |
|---|---|---|---|
| `rel/1.0` | `main` | `main` when production ready | Active dev branch |
| `feat/fix/chore` | `rel/1.0` | `rel/1.0` via PR | Day-to-day work |
| `hotfix/scope/name` | `main` | `main` + `rel/1.0` + `rel/2.0` | Emergency only |
| `tag: v1.0.0` | `rel/1.0` after merge to main | — | Full release tag |
| `tag: v1.0.1` | `rel/1.0` after hotfix merges in | — | Patch tag, then rel/1.0 → main |
| `rel/1.1` | `main` after `v1.0.0` tag | `main` when ready | Cut from stable tag |

The consistent rule is: **tags always come from `rel/*`**, never directly from `main`. Main is the destination, not the source of truth for what shipped.

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

1. **Pattern:** `main`
2. **Pattern:** `rel/*`

For each pattern, enable:

| Setting | Action |
|---------|--------|
| **Require a pull request before merging** | Enable. Require 1 approval. Dismiss stale approvals on new commits. |
| **Require review from Code Owners** | Enable. Changes under `.github/` need approval from the owners in [CODEOWNERS](../.github/CODEOWNERS). |
| **Require status checks to pass** | Enable. Require branches to be up to date. |
| | Add required checks: `Commit Message Format` and `Biome Checks` (from `ci-lint.yml`), `Quality Gate Summary`, `Schema Validation Tests`, `Unit Tests`, `Integration Tests`, `E2E Tests` |
| **Require conversation resolution before merging** | Enable. |
| **Include administrators** | Enable. Prevents bypass by repo admins. |

### Code Scanning

**Advanced Security**
- On GitHub, go to Settings → Advanced Security
- Enable Dependency graph, Dependabot alerts and Secret scanning (also turn on push protection).
- Leave CodeQL **Default setup** off — code scanning is done by workflow (GitHub rejects workflow CodeQL uploads while default setup is on).

**Workflow ([ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml))**
- **Semgrep** (`sast-private-repo-semgrep`, private/internal repos only) — static analysis on PRs to `main` and `rel/**` and on pushes to `main`. Fails the job on findings, so it blocks `Quality Gate Summary`. The SARIF report is kept as a build artifact, not uploaded to the Code scanning tab.
- **CodeQL** (`sast-public-repo-codeql`, public repos only) — scans `javascript-typescript`, `python` and `actions` (workflow files) with the `security-extended` query suite, `build-mode: none`.
  - Skipped on private repos (they need GitHub Code Security). If you have it, remove the `github.event.repository.visibility == 'public'` condition on the `sast-public-repo-codeql` job (and change the `sast-private-repo-semgrep` condition if you don't want both).
  - The job succeeds even when it finds issues — results go to **Security** → **Code scanning**. To block merges on findings, add a **Require code scanning results** rule (tool: CodeQL) to the ruleset for `main` and `rel/**`.
  - Results: **Security** → **Code scanning**. To block merges on new alerts, add a **Require code scanning results** rule to the branch ruleset.

This is separate from the `NPM audit` job in the same workflow: Semgrep/CodeQL are static analysis of this repo's own source code, `npm audit` checks for known CVEs in dependencies. Keep both.

### Dependabot

Version-update PRs are already configured in [.github/dependabot.yml](../.github/dependabot.yml):

- `npm` — root directory (covers all workspaces via `apps/*`, `common/**`, `scripts/*`)
- `github-actions` — `/` for workflow files plus `.github/actions/*` for composite actions (e.g. `checkout`, `setup-node-npm-install`)

Both run weekly and need no workflow file — GitHub schedules them itself.

Separately, enable **Dependabot alerts** via **Settings** → **Code security** → **Dependabot** — this flags known CVEs in dependencies as they're published, complementing (not replacing) the `NPM audit` job in `ci-quality-gates.yml`.

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

Changelog and tag automation are handled by the [`release-please`](https://github.com/googleapis/release-please-action) job in [.github/workflows/release.yml](../.github/workflows/release.yml). It runs on every push to `main` and `rel/**` and does not re-run tests — branch protection already requires PR checks to pass before merge.

- The workflow runs `release-please-action` in manifest mode using
  - [release-please-config.json](../release-please-config.json) and
  - [.release-please-manifest.json](../.release-please-manifest.json)
- Releases are tracked per workspace for `apps/*`.
- The workflow requires a GitHub App installation token [setup](#GitHub-App-Token-Setup).
- Troubleshooting lives in [release-troubleshooting.md](./release-troubleshooting.md).

### How It Works

1. A commit lands on `main` or `rel/*`.
2. The `release-please` job scans merged Conventional Commits for each configured workspace.
3. If [releasable commits](#releasable-commits) exist for one or more workspaces, it opens or updates workspace-scoped release PRs.
4. When release PRs are merged, `release-please` updates changelogs, creates workspace-scoped tags, and publishes GitHub releases.

### Releasable Commits

- `feat`, `fix`, and `deps` trigger a release PR.
- `chore` can appear in the changelog if a release is already happening, but `chore` by itself does not trigger a release PR.
- To force a release version manually, add a `Release-As: x.y.z` footer to the commit body.

### GitHub App Token Setup

Use a GitHub App instead of a PAT if you want release PRs and release-created events to trigger downstream workflows.

1. Create the GitHub App under GitHub Settings → Developer settings → GitHub Apps → New GitHub App.
2. Disable webhooks and grant these repository permissions:
   - `Contents`: Read and write
   - `Pull requests`: Read and write
   - `Issues`: Read and write
   - `Metadata`: Read-only
3. Install the app on this repository.
4. Add the app ID to variable `RELEASE_PLEASE_APP_ID` and the PEM private key to secret `RELEASE_PLEASE_APP_PRIVATE_KEY`.
5. If your repository or organization restricts workflow-created PRs, enable the setting that allows GitHub Actions to create and approve pull requests.

Once configured, the workflow step uses [actions/create-github-app-token](https://github.com/actions/create-github-app-token) to mint a short-lived installation token and passes it to `release-please`.

If the variable or secret is missing, the workflow fails early instead of falling back to `GITHUB_TOKEN`.

---

## Rebase Or Merge

Use the repo workflow rather than a per-team merge style.

- Day-to-day feature and fix PRs should use squash merge.
- Open those PRs from `feat/*`, `fix/*`, or `chore/*` into the active `rel/*` branch.
- Reserve `hotfix/*` branches for urgent fixes that start from `main`, merge to `main`, and are then backported to active `rel/*` branches.
- Use cherry-pick for hotfix backports when the same fix must land in multiple release branches.

This keeps release history predictable for `release-please` and matches the contributor workflow in [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md).

---

## CI

Please read the following scripts for information on the CI workflows

1. Lint workflow [ci-lint.yml](../.github/workflows/ci-lint.yml) — commit messages, Biome, workflow YAML
2. Tests workflow [ci-tests.yml](../.github/workflows/ci-tests.yml) — schema, unit, integration, e2e
3. Quality gates workflow [ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml) — security scans, coverage, duplication

Changes to `.github/` can go in the same PR as other code. Review of them is enforced by [CODEOWNERS](../.github/CODEOWNERS) (`/.github/` entry) — enable **Require review from Code Owners** in the branch protection rules / ruleset for `main` and `rel/**`.

Once configured:
- PRs show red X if any required check fails.
- Merges are blocked until all checks pass and approvals are met.
- The branch protection rules apply uniformly across day-to-day work (`rel/*` branches), production merges (`main`), and emergency hotfixes.

> **Note:** tests (unit, integration, e2e) are run for touched workspaces only, identified by the `detect-touched-workspaces`, Skip test if npm script for test not found.

### CI Workflow

1. PR submitted to main or release branches
2. CI runs on PR submitted
  - format + lint check (Biome) and commit message check — in [ci-lint.yml](../.github/workflows/ci-lint.yml), on every branch
  - repo-wide schema check, no autofix
  - repo-wide testing, no autofix
  - repo-side package audit, no autofix?
3. Only allow merge if all checks pass

### Lint Workflow

[ci-lint.yml](../.github/workflows/ci-lint.yml) runs on PRs and pushes on **every** branch, with no change-scope detection:

- **Commit Message Format** — every commit in the PR / push must follow Conventional Commits (`feat|fix|chore`).
- **Biome Checks** — `biome ci` on touched workspaces only (the first push of a new branch checks everything).
- **Lint Workflow YAML** — `prettier --check` on `.github/workflows/*.yml` and `.github/actions/**/*.yml`, then `actionlint` (with shellcheck for `run:` scripts) on `.github/workflows/*.yml`. Drafts in `.github/workflows/todo/` are skipped (GitHub does not run workflows in subfolders). Known false positives are ignored in [.github/actionlint.yaml](../.github/actionlint.yaml). Fix formatting locally with `npx prettier@3 --write ".github/workflows/*.yml" ".github/actions/**/*.yml"`.

A push to a branch with an open PR triggers both a push and a PR run.

### Quality Gates Workflow

[ci-quality-gates.yml](../.github/workflows/ci-quality-gates.yml) runs on PRs to `main` and `rel/**`, and on pushes to `main`:

- **Gitleaks secret scan** — scans the git history for committed secrets.
- **NPM audit** — `npm audit --omit=dev --audit-level=moderate` against the root lockfile (all workspaces).
- **Dependency vulnerability scan** — `dependency-review-action` blocks PRs that add dependencies with known vulnerabilities (PRs on public repos only; needs the dependency graph enabled).
- **Security Scan - Semgrep** (private/internal repos) — security scan; on PRs only *new* findings fail the job. The SARIF report is kept as a build artifact.
- **SAST CodeQL Analysis** (public repos) — security scan; results go to Security → Code scanning (see [Code Scanning](#code-scanning)).
- **Test Coverage** — runs every workspace's `test:unit` script with an extra lcov reporter, merges the reports into `coverage/lcov.info` and uploads it to Codecov.
- **Duplication Check (jscpd)** — fails if duplication exceeds 5% (optional; see the workflow header to drop it or make it advisory).

Setup:

1. Sign in to [Codecov](https://about.codecov.io/) with GitHub and add this repository.
2. Copy the repository upload token and add it as Actions secret `CODECOV_TOKEN` (Settings → Secrets and variables → Actions). Without it the upload step fails (`fail_ci_if_error: true`).
3. If the repository is owned by a GitHub **organization**, get a free license key from [gitleaks.io](https://gitleaks.io/) and add it as Actions secret `GITLEAKS_LICENSE`. Repos owned by a personal account don't need it.
4. Enable the **Dependency graph** (Settings → Advanced Security) — `dependency-review-action` needs it. On private repos the job is skipped (it needs GitHub Code Security); if you have it, remove the visibility condition on the `dependency-audit` job.
5. In the branch protection rules / ruleset for `main` and `rel/**`, add `Quality Gate Summary` as a required status check — it fails if any gate job fails, so it is the only check you need to require from this workflow.
6. Public repos: in the same ruleset, add a **Require code scanning results** rule for CodeQL — the `sast-public-repo-codeql` job itself does not fail on findings, so without this rule CodeQL is report-only.