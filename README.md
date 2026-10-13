## Description

[novex-kit](https://github.com/ais-one/novex-kit) is a monorepo **template** for building full-stack JavaScript applications, micro-services and frontends with NodeJS (**version 24 or Higher**). VueJS and ExpressJS are highlighted but end-user is free to implement their own JS/TS stack.

## Important Information

### For End-user

- This is a template repo. **Do NOT** use directly. Create End-user repo based on novex-kit template
- **ONLY** make modifications to the following in their own repository.
  - anything in side the following folders
    - `apps`: workspace codes, documents, scripts, etc.
    - `db`: database schemas, migrations and seeds, etc. (one workspace per PostgreSQL schema)
  - the following files at repo root
    - `package.json`
    - `package-lock.json`
  - `local-` prefixed workflows in `./github/workflows` folder
- **NEVER!!!** touch anything else. If you need to override or create features
  - do it in the `apps` folder if urgent
  - raise an issue or submit a PR contribution
- End-users can pull in template updates using the [Sync Upstream Template](docs/githubmd#sync-upstream-template) workflow

### For Contributor (or Maintainer)

- fork/clone the repo to improve/maintain the framework
- For Contributors, read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) and [.github/SECURITY.md](.github/SECURITY.md) before opening issues or pull requests.

### Folder Layout

Full folder layout — every app, package and schema: [docs/structure.md](docs/structure.md).

### Instructions

Both End-user and Contributor must read and follow the documentation below.

- Install packages from root level only, if it is used by workspace, name the workspace
- git related
  - Setup [hooks](docs/git.md#hooks)
  - Read on [branch naming and workflows](docs/git.md#branching-and-workflow)
  - Read on [commit messaging](docs/git.md#commit-message)
  - Read on [Pull Requests](docs/git.md#pull-requests)
- github related Setup your downstream repository
  - [rulesets](docs/github.md#rulesets)
  - [environment](docs/github.md#repository-environment)
  - [Advanced Security](docs/github.md#advanced-security)
  - [CI](docs/github.md#ci)
  - [The full workflow list](docs/github.md#workflows).
  - [Release Management](docs/github.md#release-management)
- READ
  - [Design Features](docs/NOTES.md#design-features)
  - [Engineering standards](docs/conventions.md) format, lint, commit message, language, tooling, etc.
  - [Housekeeping](docs/housekeeping.md) dependency and GitHub Actions updates — Dependabot plus on-demand Claude Code commands
  - [Testing](docs/testing.md)
  - [OPTIONAL: Roadmap](docs/NOTES.md#roadmap)
  - [OPTIONAL: repo custom properties](https://docs.github.com/en/organizations/managing-organization-settings/managing-custom-properties-for-repositories-in-your-organization)


## Quickstart

### Getting started with
- Sample API backend [apps/sample-api](docs/install.md#run-sample-api)
- Minimal Vue frontend [apps/sample-vue-minimal](docs/install.md#run-minimal-vue-application)
- Sample Vue frontend [apps/sample-vue-full](docs/install.md#install--run-sample-vue-application)
- Shared codes [`common/`](common) ESM modules for Node, browser, Vue, and isomorphic code
  - sample implementations for SAML, OIDC, OAuth, OTP, FIDO2, and push notifications, zod, OpenAPI, etc.
- Database schemas, migrations, and seeds [db](db) and mock services [scripts/service-mocks](scripts/service-mocks)

### Creating Own apps/services
- API [backend](docs/create-app.md#creating-a-new-app-or-service) — `create:app` CLI or copy `sample-api`
- Vue [frontend](docs/create-app.md#creating-a-new-frontend-app)
- Publish common/** workspaces to [npm](docs/install.md#publishing-packages-to-npm). **for template maintainers ONLY**
