---
description: Scan .github for outdated or unpinned GitHub Actions and review/apply updates one at a time
argument-hint: [path-or-owner/repo filter, optional]
---

Audit every external GitHub Action referenced under `.github/` and bring each one up to date, one change at a time, with explicit approval before editing anything.

## Hard rule: no guessing

Every version and every commit SHA proposed in this run must come from a live API call made *during this run* — never from training knowledge, memory of what a tag "usually" points to, a remembered SHA from a previous action or previous run, or a plausible-looking guess. If a lookup fails (rate-limited, network error, repo not found, unexpected API shape), stop and report the failure for that action instead of falling back to an assumed value — do not propose a change you could not verify live. Every SHA handed to the user must have been independently confirmed to resolve to a real commit via a `git/commits/<sha>` call in this same run, not just copied from a tag/release response.

## 1. Discover references

Search `.github/workflows/*.yml` and `.github/actions/**/action.yml` for `uses:` lines. Optional argument `$ARGUMENTS` narrows the scan to a path or an `owner/repo` substring — if empty, scan everything.

- Skip local/composite refs (`uses: ./...`) — nothing to pin or update there.
- For every remaining `uses: owner/repo@REF` line, record: file path, line number, `owner/repo`, and `REF` as currently written.
- The same `owner/repo` can appear multiple times across files pinned to different refs — treat every occurrence as its own item; don't dedupe away drift between them.

## 2. List everything found, before checking anything

Before doing any version lookups, show the user the full inventory of what was discovered — every occurrence from step 1, as a table: file, line, `owner/repo`, current `REF`, and whether it's **official** (`actions/*` or `github/*` — GitHub-owned orgs) or **third-party** (everything else). This is a plain listing, not a proposal — no API calls yet, nothing to approve, just visibility into scope before the scan starts. Then continue to version checking below.

## 3. Classify the current ref

For each occurrence, `REF` is one of:
- **A full 40-char commit SHA**, usually with a trailing `# vX.Y.Z` comment (the convention already used in this repo, e.g. `.github/workflows/soc2-security-checks.yml` and `soc2-deploy-to-production.yml`).
- **A floating tag** (`@v4`, `@v2`) or **exact semver tag** (`@v1.2.0`) — not SHA-pinned yet.

## 4. Resolve the latest version upstream

For each unique `owner/repo`, query the GitHub API (`curl -s https://api.github.com/repos/OWNER/REPO/releases/latest`; if that 404s because the project doesn't use GitHub Releases, fall back to `git/refs/tags` and pick the highest semver tag, skipping pre-releases/rc/beta unless nothing else exists).

Resolve the winning tag to a commit SHA — every step below is a real API call, not an assumption:
- `git/ref/tags/<tag>` returns an object with `"type": "commit"` (lightweight tag — that SHA is the commit) or `"type": "tag"` (annotated tag — dereference via `git/tags/<sha>` to get the real commit SHA in its `object.sha`). Don't assume a tag is lightweight vs annotated based on other actions you've seen before — check `"type"` for this specific one.
- Confirm the resolved SHA actually resolves via `git/commits/<sha>` before proposing it. A proposal with no successful `git/commits/<sha>` response in this run is invalid — treat that occurrence as failed/unresolved and report it as such rather than proposing anything.

If a `GITHUB_TOKEN`/`GH_TOKEN` env var or `gh` CLI is available, prefer authenticated requests to avoid the 60/hour unauthenticated rate limit when there are many actions to check.

## 5. Decide what to propose per occurrence

- Floating tag today, and a newer version exists upstream → propose bumping **and** SHA-pinning in one change: `owner/repo@<new-sha> # <new-version>`.
- Floating tag today, already at the latest version → still propose SHA-pinning it (unpinned floating tags are a supply-chain risk independent of version currency): `owner/repo@<resolved-sha> # <same-version>`.
- Already SHA-pinned, and a newer version exists upstream → propose bumping to the new SHA, updating the trailing version comment.
- Already SHA-pinned at the latest version → no change; note it as up to date, don't ask about it.

## 6. Walk through changes one at a time

For each proposed change, in order, show the user:
- File and line
- Action name and what's changing (e.g. `v3 → v4`, or "pin floating tag to commit SHA")
- The exact old `uses:` line and the exact new `uses:` line

Then ask for approval on that single change before moving to the next (use AskUserQuestion or a direct yes/no — don't batch multiple proposals into one question). On approval, apply the edit immediately with Edit so progress is incremental and visible; on rejection or skip, leave that line untouched and continue to the next occurrence.

## 7. Summarize

After going through every occurrence, report a short summary: how many changed, how many the user skipped, and how many were already up to date and SHA-pinned. Don't re-litigate skipped ones — this is a one-pass review per invocation.
