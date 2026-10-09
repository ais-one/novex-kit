# Release Troubleshooting

Use this guide when the manual `Release` workflow does not behave as expected.

- Workflow: [../.github/workflows/release.yml](../.github/workflows/release.yml)
- git-cliff config: [../cliff.toml](../cliff.toml)
- How releases work: [git-github.md → Release Automation](./git-github.md#release-automation)

Tip: run with `dry-run` checked first — the job summary shows the computed tag and release notes without creating anything.

## Symptom: "Releases are only cut from rel/<major>.<minor> branches"

The workflow was dispatched from another branch. Re-run it and pick the active `rel/<major>.<minor>` branch (e.g. `rel/1.0`) in the "Use workflow from" dropdown.

## Symptom: "... is not a workspace with a package.json"

The `workspace` input must be `.` or a repo-relative path to a folder containing `package.json`, e.g. `apps/sample-api` (leading `./` and trailing `/` are fine). Absolute paths and `..` are rejected.

## Symptom: "<tag> already exists - no new commits for this component since its last release"

git-cliff found no commits for that component since its last tag, so the "next" version equals the current one. For a workspace, only commits touching its path count. Nothing to release — or, if you expected changes, check they were merged into the branch you ran from.

## Symptom: The version is not what I expected

- **First release of a component** uses the `package.json` version as-is, without bumping. Edit `package.json` first, or create a baseline tag (e.g. `apps-sample-api-v0.0.6`) on an older commit so the next run bumps from it.
- **`auto` bump** rules: a breaking change (`!` or `BREAKING CHANGE:` footer) → major, any `feat` → minor, otherwise patch. Pass `bump` explicitly to override.
- **Wrong previous tag picked up**: only tags matching the component's pattern count — `v1.2.3` for `.`, `<path-with-dashes>-v1.2.3` for a workspace. Old tags in another format (e.g. bare `0.6.11`) are ignored.

## Symptom: A commit is missing from the release notes

Commits that don't parse as Conventional Commits (`feat|fix|chore(scope): ...`) are skipped — the git-cliff log warns how many. Commits starting `chore(release)` are skipped on purpose. With squash merges the PR title becomes the commit message, so check the PR title format.

## Symptom: The tag/release step fails with 403 or "Resource not accessible by integration"

1. Settings → Actions → General → Workflow permissions must not block the job's `contents: write` request (an org-level policy can force read-only).
2. A tag ruleset that restricts tag creation will block `GITHUB_TOKEN` — add GitHub Actions to its bypass list or relax the rule for the release tag patterns.

## Symptom: Another workflow did not run when the release was published

Events created with the workflow's `GITHUB_TOKEN` (the tag push and `release: published`) do not trigger other workflows, by GitHub design. Dispatch the deploy workflow manually with the new tag, or call it from `release.yml` as a reusable workflow (`workflow_call`) after the release step.
