## Description

[novex-kit](https://github.com/ais-one/novex-kit) is a monorepo **template** for building full-stack JavaScript applications, micro-services and frontends with NodeJS (**version 24 or Higher**). VueJS and ExpressJS are highlighted but end-user is free to implement their own JS/TS stack.

The folder contents are as follows:
- `apps`: userland backend and frontend application workspaces
- `scripts`: deployment, service mocks and documentation scripts
- `common`: shared JavaScript used by `apps` / `scripts`
- `docs`: for documentation

**IMPORTANT!** The `apps` folder is for **userland** content. E.g workspace codes, documents, scripts, schemas, etc. End-users please work within the apps folder.

Other files and folders are managed by template maintainers.

## Quickstart

### Getting started with
- Sample API backend [apps/sample-api](docs/install.md#Run-Sample-API)
- Mininal Vue frontend [apps/sample-vue-minimal](docs/install.md#run-minimal-vue-application)
- Sample Vue frontend [apps/sample-vue-full](docs/install.md#install--run-sample-vue-application)
- Shared codes [`common/*`](`common/*`) ESM modules for Node, browser, Vue, and isomorphic code
  - sample implementations for SAML, OIDC, OAuth, OTP, FIDO2, and push notifications, zod, OpenAPI, etc.
- Database schemas, migrations, and seeds [db](db) and Mock serivces[scripts/service-mocks](scripts/service-mocks)

### Creating Own apps/services
- API [backend](docs/install.md#Create-New-Backend-App-Or-Service)
- Vue [frontend](docs/install.md#create-new-web-or-vue-frontend)
- Publish common/** workspaces to [npm](docs/install.md#Publishing-packages-to-npm). **for template maintainers ONLY**

## Read Me First

- Contributors: read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) and [.github/SECURITY.md](.github/SECURITY.md) before opening issues or pull requests.
End Users: **BEFORE** making **ANY** changes. Read the following:

- SETUP
  - [git hooks](docs/git-github.md#hooks-setup-and-usage)
  - [template updating](.github/workflows/update-template.yml)
  - [branching-and-protection](docs/git-github.md#branch-and-protection-rules)
  - [commit message lint](docs/git-github.md#commit-message)
  - [release automation](docs/git-github.md#release-automation)
  - [secret scanning](https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/secret-security/about-secret-scanning)
  - [security](https://github.com/settings/security_analysis)
- READ
  - [Merge strategy](docs/git-github.md#rebase-or-merge)
  - [Engineering standards](docs/conventions.md) format, lint, commit message, language, tooling, etc.
  - [Workflows](docs/git-github.md#ci)
  - [Housekeeping](docs/housekeeping.md) dependency and GitHub Actions updates — Dependabot plus on-demand Claude Code commands
  - [Design Features](docs/NOTES.md#design-features)
  - [OPTIONAL: Roadmap](docs/NOTES.md#roadmap)
  - [OPTIONAL: repo custom properties](https://docs.github.com/en/organizations/managing-organization-settings/managing-custom-properties-for-repositories-in-your-organization)

## CI/CD

- [Deploy backend to container registry](.github/workflows/deploy-cr.yml)
- [Publish a package to npm](.github/workflows/deploy-npm.yml)
- [Deploy frontend (Vue) to object store](.github/workflows/deploy-bucket.yml)
