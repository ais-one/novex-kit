## Description

[novex-kit](https://github.com/ais-one/novex-kit) is a monorepo **template** for building full-stack JavaScript applications, micro-services and frontends with NodeJS (**version 24 or Higher**). VueJS and ExpressJS are highlighted but end-user is free to implement their own JS/TS stack.

The folder contents are as follows:
- `apps`: **userland** backend and frontend application workspaces
- `db`: **userland** database schemas, migrations and seeds (one workspace per PostgreSQL schema)
- `scripts`: deployment, service mocks and documentation scripts
- `common`: shared JavaScript used by `apps` / `scripts`
- `docs`: for documentation

Full layout — every app, package and schema: [docs/structure.md](docs/structure.md).

**IMPORTANT!**

End Users and Contributors: **BEFORE** making **ANY** changes. Read the following:

- For Contributors, read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) and [.github/SECURITY.md](.github/SECURITY.md) before opening issues or pull requests.
- This is a template repo. **Do NOT** use directly. Create your new repo using this as the template
- The `apps` folder is for **userland** workspace codes, documents, scripts, etc.
- The `db` folder is for **userland** schemas, migrations, seeds, etc.
- End-users **MUST** work within these folders
- Template maintainers **MUST** work outside `apps` and `db` folders
- End-users can pull in template updates using the [Sync Upstream Template](docs/github.md#sync-upstream-template) workflow — it prepares a `chore/sync-upstream` branch; you open and review the PR.
- End-users can fork and make PR for requested features, or roll out their own in the `apps` folder.
- only the `package.json` and `package-lock.json` files outside the `apps` can be modified (Note that a Sync Upstream Template will replace those file with the upstream ones)
- git related
  - Setup [hooks](docs/git.md#hooks)
  - Read on [branch naming and workflows](docs/git.md#branching-and-workflow)
  - Read on [commit messaging](docs/git.md#commit-message)
- github related Setup your downstream repository
  - [rulesets](docs/github.md#rulesets)
  - [environment](docs/github.md#repository-environment)
  - [Advanced Security](docs/github.md#advanced-security)
  - [CI](docs/github.md#ci)
  - [Release Management](docs/github.md#release-management)
- READ
  - [Engineering standards](docs/conventions.md) format, lint, commit message, language, tooling, etc.
  - [Housekeeping](docs/housekeeping.md) dependency and GitHub Actions updates — Dependabot plus on-demand Claude Code commands
  - [Design Features](docs/NOTES.md#design-features)
  - [OPTIONAL: Roadmap](docs/NOTES.md#roadmap)
  - [OPTIONAL: repo custom properties](https://docs.github.com/en/organizations/managing-organization-settings/managing-custom-properties-for-repositories-in-your-organization)

## CI/CD

The full workflow list — triggers, purpose and required checks — is in [docs/github.md](docs/github.md#workflows).

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
