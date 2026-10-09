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
* Always work on a new branch. Do not work directly on `main`.
* Use branch names that follow the documented workflow: `feat/<scope>/<name>`, `fix/<scope>/<name>`, or `chore/<scope>/<name>`.
* Create normal feature and fix branches from the active `rel/[0-9]*.[0-9]*` branch and open the PR back into that same `rel/[0-9]*.[0-9]*` branch.
* Reserve `hotfix/*` branches for urgent production issues. Hotfix branches start from `main`, merge to `main`, and then must be backported to active `rel/[0-9]*.[0-9]*` branches as needed.
* Do not open day-to-day feature PRs directly against `main`. In this workflow, `main` is the stable destination branch.
* PRs should be merged with a squash merge to keep history clean and consistent with the repo workflow.
* Use a descriptive PR title. Prefer the same Conventional Commit style used for commits, for example `fix(auth): handle expired token`.
* For changes and feature requests, include a clear description of the problem, the proposed behavior, and any relevant example, request, or UI/API markup.
* Reference the issue that the PR resolves, for example `Fixes #1234` or `Resolves #6458`.

