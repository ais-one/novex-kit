# novex-kit Contributing Guide
Hello and thank you for your interest in helping make novex-kit better. Please take a few moments to review the following guidelines:

## Important Information
* For general questions, please join [Our Discussion Board](https://github.com/ais-one/novex-kit/discussions).
* For repository-wide coding and runtime conventions, see [../docs/conventions.md](../docs/conventions.md).
* Install packages from root level only, if it is used by workspace, name the workspace

## Reporting Issues
* Do not use public GitHub issues for security vulnerabilities. Follow the private reporting instructions in [SECURITY.md](./SECURITY.md).
* The issue list of this repo is **exclusively** for Bug Reports and Feature Requests.
* Bug reproductions should be as **concise** as possible.
* **Search** for your issue, it _may_ have been answered.
* See if the error is **reproducible** with the latest version.
* If reproducible, please provide a [Codepen](https://codepen.io/) or public repository that can be cloned to produce the expected behavior. It is preferred that you create an initial commit with no changes first, then another one that will cause the issue.
* **Never** comment "+1" or "me too!" on issues without leaving additional information, use the :+1: button in the top right instead.

## Pull Requests
* Always work on a new branch, never directly on `main` or `rel/*`.
* Follow the branch naming and merge flow in [docs/git.md](../docs/git.md#branching-and-workflow): `feat/`, `fix/`, `chore/` from the right `rel/x.y` branch, PRs back into it; fixes go to every affected release line ([Fixes Across Release Lines](../docs/git.md#fixes-across-release-lines)).
* Don't open PRs against `main` — only `rel/x.y` branches merge there.
* PR titles must be Conventional Commits (e.g. `fix(auth): handle expired token`); they become the squash commit used for versions and release notes. Change GitHub's suggested title (the branch name) before merging.
* For changes and feature requests, include a clear description of the problem, the proposed behavior, and any relevant example, request, or UI/API markup.
* Reference the issue that the PR resolves, for example `Fixes #1234` or `Resolves #6458`.

