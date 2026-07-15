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
| **Require status checks to pass** | Enable. Require branches to be up to date. |
| | Add required checks: `Commit Message Format`, `Biome Checks`, `Schema Validation Tests`, `Unit Tests`, `Integration Tests`, `E2E Tests` |
| **Require conversation resolution before merging** | Enable. |
| **Include administrators** | Enable. Prevents bypass by repo admins. |

### Code Scanning (CodeQL)

Enable via **Settings** → **Code security** → **Code scanning** → **CodeQL analysis** → **Set up** → **Default**.

- GitHub auto-detects JavaScript/TypeScript and runs scans on its own managed schedule — no workflow file needed in `.github/workflows/`.
- This is separate from the `npm audit` step in the `security` job of [ci.yml](../.github/workflows/ci.yml): CodeQL is static analysis of this repo's own source code, `npm audit` checks for known CVEs in dependencies. Keep both.

### Dependabot

Version-update PRs are already configured in [.github/dependabot.yml](../.github/dependabot.yml):

- `npm` — root directory (covers all workspaces via `apps/*`, `common/**`, `scripts/*`)
- `github-actions` — `/` for workflow files plus `.github/actions/*` for composite actions (e.g. `checkout`, `setup-node-npm-install`)

Both run weekly and need no workflow file — GitHub schedules them itself, same as CodeQL default setup.

Separately, enable **Dependabot alerts** via **Settings** → **Code security** → **Dependabot** — this flags known CVEs in dependencies as they're published, complementing (not replacing) the `npm audit` step in `ci.yml`.

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

Changelog and tag automation are handled by the [`release-please`](https://github.com/googleapis/release-please-action) job in [.github/workflows/ci.yml](../.github/workflows/ci.yml).

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

1. CI Meta workflow [ci-meta.yml](../.github/workflows/ci-meta.yml)

Changes must be only to `.github/workflows` OR `.github/actions` folder

2. CI workflow [ci.yml](../.github/workflows/ci.yml)

Changes must not be to `.github/workflows` AND `.github/actions` folders

Once configured:
- PRs show red X if any required check fails.
- Merges are blocked until all checks pass and approvals are met.
- The branch protection rules apply uniformly across day-to-day work (`rel/*` branches), production merges (`main`), and emergency hotfixes.

> **Note:** tests (unit, integration, e2e) are run for touched workspaces only, identified by the `detect-touched-workspaces`, Skip test if npm script for test not found.

### CI Workflow

1. PR submitted to main or release branches
2. CI runs on PR submitted
  - repo-wide format check, no autofix
  - repo-wide lint check, no autofix
  - repo-wide schema check, no autofix
  - repo-wide testing, no autofix
  - repo-side package audit, no autofix?
3. Only allow merge if all checks pass

### CI Meta Workflow

1. Make CI changes on a `chore/ci/<name>` branch.
2. Use commit messages in Conventional Commit format, for example `chore(ci): tighten workflow validation`.
3. Run `act` locally to validate before pushing.
4. Push `chore/ci/<name>` to trigger [ci-meta.yml](./workflows/ci-meta.yml). This workflow only runs for changes under `.github/workflows/**` and `.github/actions/**`.
5. Open a PR from `chore/ci/<name>` to `ci-staging` and confirm the workflow is green end-to-end.
6. After validation, open a PR from `ci-staging` to `main`.