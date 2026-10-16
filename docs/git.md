## Hooks

This repository uses native Git hooks in `.githooks/`.

- Pre-commit scans staged files for secrets (secretlint), then runs Biome checks on affected directories and schema validation tests where applicable.
- Commit-msg validates the message against Conventional Commits (`feat`, `fix`, `hotfix`, `chore` only).
- Pre-push runs unit tests (`test:unit`) in every workspace that has them, then type checks (`tsc --noEmit`) every TypeScript project.

To skip hooks temporarily:
```bash
git commit --no-verify
git push --no-verify
```

### Setup And Usage

They are activated automatically by `npm install` — its `prepare` script runs [.githooks/setup.sh](../.githooks/setup.sh), which:
- marks `pre-commit`, `commit-msg` and `pre-push` executable
- clears any existing `core.hooksPath` (`--unset-all`, so a key set more than once doesn't block the update), then sets it to `.githooks` in this clone's `.git/config`

If installed with `--ignore-scripts`, or to re-apply the setup without reinstalling:

```bash
npm run prepare
```

Install failure prints `Can not set git hooks` but does not fail the install — check the install output if hooks don't fire.

**Windows:** run `npm install` from Git Bash

### pre-commit hook

Runs automatically on every `git commit`:

| Check | Details |
|-------|---------|
| **Secret scan (secretlint)** | Runs [secretlint](https://github.com/secretlint/secretlint) (recommended preset, config in [.secretlintrc.json](../.secretlintrc.json)). Refer to [pre-commit hook](../.githooks/pre-commit)|
| **Biome format & lint** | Runs `npx biome check` on each affected directory (`common/vanilla/iso`, `common/compiled/node`, `common/compiled/vue`, `common/vanilla/web`, `apps`, `scripts`). Run `npm run check:write` to auto-fix. |
| **Schema validation tests** | Runs `npm run test:schemas -- <folder>` for each affected schema directory (`common/schemas`, `apps/*/schemas`). **TODO:** Zod validation of staged config files? OpenAPI spec linting ?|

### commit-msg hook

Runs automatically on every `git commit`, after pre-commit, and checks the commit message:

| Check | Details |
|-------|---------|
| **Conventional Commits format** | refer to [# Commit Message](#commit-message) |
| **Skipped messages** | Messages starting with `Merge `, `fixup! ` or `squash! ` (git-generated) are not checked — the same list as CI. `git revert`'s default `Revert "…"` message **is** checked and rejected: reword it to `chore: revert …` (e.g. `git revert --edit <sha>`). |

On failure the hook prints the rejected message and the expected format. Use `npx czg` to compose a valid message interactively — see [Commit Message](#commit-message).

The same pattern is checked again in CI (the `commit-lint` step of `Lint / Lint Check`) for every commit in a PR, and on the PR title (`PR Title Format`).

### pre-push hook

Runs automatically on every `git push`:

| Check | Details |
|-------|---------|
| **Workspace unit tests** | Runs `npm run test:unit --workspace=<ws>` for every workspace (`apps/*`, `common/compiled/*`, `common/vanilla/*`, `db/*`, `scripts/*`) that has a `test:unit` script, touched or not, and blocks the push if any fail. Workspaces without `test:unit` (or with an unreadable `package.json`) are listed as **Skipped**; if none has the script, the hook warns that no unit tests ran.|
| **Type checking** | Runs `tsc --noEmit -p <dir>` for every `apps/*` app with a `tsconfig.json`, plus the shared group projects `common/`, `db/` and `scripts/`, and blocks the push if any fail.|

TODO:
- Unit tests related to the changed files, not the full suite.

---

## Branching And Workflow

Always work on a new branch, never directly on `main` or `rel/*`.

### Branch(or line) & Tag Names

Use the table below to find out where a branch starts and where it merges.

|Type|Format|Branch/Create From|Merge To|Lifetime|Notes|
|----|------|-----------|--------|--------|-----|
|Stable branch|`main`| - | - | permanent | Stable branch — what's in production |
|Release branch|`rel/x.y`|`main` (when initial release tag is created from next-release line)|`main` (from current-release line) after each release tag via PR **merge** commit (never squash — the line merges into `main` repeatedly)|removed when release line is no longer supported|current-release line (e.g. `rel/1.0`)<br>next-release line (e.g. `rel/1.1` or `rel/2.0`)|
<<<<<<< HEAD
|Working branches|`feat,fix,chore`|next-release line|next-release line via PR **Squash**|delete after PR merge|
=======
|Working branches|`feat,fix,chore`|next-release line|next-release line via PR **Squash**|delete after PR merge|`<type>/[<scope>/][<issue>-]<name>`, e.g. `fix/auth/123-expired-token` or `chore/deps-update` — issue number optional|
>>>>>>> chore/wip
|Hotfix branch|`hotfix`|current release line|production line is released **immediately**, next-release-line|short-lived: delete after **all** its PRs merge [Fixes Across Release Lines](#fixes-across-release-lines)|
|Release tags|`v<major>.<minor>.<patch>`(root framework)<br><br>`<workspace-path>-v<major>.<minor>.<patch>`(app/db workspaces — path with `/` → `-`, e.g. `apps-sample-api-v1.2.3`)|`rel/1.0`| NA | NA | `<patch> = 0` initial release, `<patch> > 0` for subsequent release tags |

### Fixes Across Release Lines

A bug often exists in more than one release line — e.g. in `rel/1.0` (production) and `rel/1.1` (next release). The same flow covers a scheduled `fix/*` and an urgent `hotfix/*`; only the timing of the release differs.

**Which lines get the fix:**

- **Every supported line that has the bug** — the production line, plus any older line still receiving patches.
- **Every newer line, released or not** — skipping one means the bug comes back when that line ships.
- Skip a line only when the bug isn't in it (introduced later, or the code was rewritten), or the line no longer gets patches (users should upgrade).

**The flow — one branch, one PR per target, no cherry-picking.** Example: `rel/1.0` is in production (`v1.0.0`), `rel/1.1` is not released yet.

```
hotfix/payment-crash (or fix/payment-crash - branch from the commit all targets share, here v1.0.0)
  → PR into rel/1.0 (squash)
      → release v1.0.1 from rel/1.0 (Release workflow)   ← hotfix: now; fix: with the next scheduled patch release
      → PR rel/1.0 into main (merge commit)              ← main matches production again
  → PR into rel/1.1 (squash)                             ← no tag; ships in 1.1.0
```

**1. Create the branch from the shared base**

```bash
git fetch origin
# the newest commit contained in every branch the fix must reach
BASE=$(git merge-base --octopus origin/rel/1.0 origin/rel/1.1 origin/rel/2.0)
git describe --tags "$BASE"   # usually the production tag, e.g. v1.0.0
git switch -c hotfix/payment-crash "$BASE"   # or fix/<scope>/<name>
# fix, commit (Conventional Commits, type fix), push
```

Branch from the shared base, not from `rel/1.0` or the latest patch tag: anything after that point that isn't in every target (e.g. an earlier fix's squash commit on `rel/1.0`, or `v1.0.1`) would show up in the PRs into the newer branches. Each PR's diff should contain only this fix. A fix needed in a single line simply branches from that line.

**2. Open one PR per target** — every line chosen above. Title them `fix(...)`: the squash commit's type sets the version bump, and a `feat` title would turn the patch into a minor release (`v1.1.0` on a maintenance line). Each PR runs CI against its own target and shows its own conflicts.

**3. Merge the production-line PR first.**
- **Hotfix:** release immediately — the tag is the critical path: nothing ships until `v1.0.1` exists, and tags only come from `rel/x.y`.
- **Fix:** no immediate release — it ships with the next patch release of that line, together with other fixes merged by then.
- Either way, everything merged into `rel/1.0` since the last tag goes into that release — check `git log v1.0.0..rel/1.0`, and preview the version with the Release workflow's `dry-run` (force `bump: patch` if it isn't the patch you expect).
- After tagging, merge `rel/1.0` into `main` (merge commit) right away, so `main` never holds unreleased work.

**4. Merge the remaining PRs.** Only lines in production get a patch tag; unreleased lines ship the fix in their next release.

Caveats:
- **Keep the branch until every PR is merged.** Deleting a branch closes all open PRs from it — don't click **Delete branch** after the first merge, and if **Settings → General → Automatically delete head branches** is on, use **Restore branch** on the merged PR, then reopen the others.
- **Never click "Update branch" or use GitHub's conflict editor on a branch with several PRs.** Both merge the PR's target (e.g. all of `rel/1.1`) into the shared branch, so every other PR from it — including the one into the production line — would pick up those changes. "Out of date" on these PRs is expected and harmless while "Require branches to be up to date" is off (see [Why "up to date" is off](github.md#why-up-to-date-is-off)).
- **Conflicts in a newer line** (the code changed there): close that one PR, branch e.g. `hotfix/payment-crash-rel-2.0` from `rel/2.0`, re-apply the fix there, and PR that instead — conflicts are then resolved on a branch only that target uses.
- **Squash merge means each target gets its own commit** for the same fix — expected. When `rel/1.1` is later merged into `main`, git sees the identical change on both sides and normally merges it cleanly.
- **A patch release is not the same as a hotfix.** A patch release is any release that bumps `x.y.Z` — scheduled `fix`/`chore` work as well as a hotfix. A hotfix is the urgent route; it usually *produces* a patch release.

---

## Commit Message

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) — compose them with **czg** (below) instead of `git commit -m "…"`.

- Only `feat`, `fix`, `hotfix`, and `chore` may be used as the top-level commit types.
  - `feat` — new behaviour the user/consumer sees
  - `fix` — corrects broken behaviour
  - `hotfix` — urgent fix for broken behaviour in production, released immediately
  - `chore` — everything else: `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, and `revert` style changes
- Commit messages must use the format `type(scope): short description`.
- Breaking changes must add `!` before `:` — e.g. `feat(auth)!: replace token format`.

```bash
npx czg # Interactive prompt (guided commit message)
npx czg --ai # AI-generated message (requires API key)
```

Install globally for convenience:
```bash
npm install -g czg
```

When choosing a scope in `czg`:

- Prefer a real workspace scope such as `apps/...` or `common/...` when the change is limited to one workspace.
- Use `docs` for documentation-only changes.
- Use `ci` for workflow, hook, or automation changes.
- Use `repo` for root-level or cross-cutting changes that do not fit a single workspace.

---

## Pull Requests

* Follow [Branching And Workflow](#branching-and-workflow): `feat/`, `fix/`, `chore/` from the right `rel/x.y` branch, PRs back into it (squash merge); fixes go to every affected release line ([Fixes Across Release Lines](#fixes-across-release-lines)).
* Don't open PRs against `main` — only `rel/x.y` branches merge there.
* PR titles must be Conventional Commits (e.g. `fix(auth): handle expired token`); they become the squash commit used for versions and release notes. Change GitHub's suggested title (the branch name) before merging.
  * Repo setting: **Settings** → **General** → **Pull Requests** → **Allow squash merging** → **Default commit message** = **Pull request title** (or **Pull request title and description**). The GitHub default uses the commit message instead of the title when the PR has a single commit, which would bypass the title check.
* For changes and feature requests, include a clear description of the problem, the proposed behavior, and any relevant example, request, or UI/API markup.
* Reference the issue that the PR resolves, for example `Fixes #1234` or `Resolves #6458`.
