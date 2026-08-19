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
- API [backend](docs/install.md#Create-New-Backend-App-Or-Service) — or use the [app creation CLI](#creating-a-new-app-or-service) below
- Vue [frontend](docs/install.md#create-new-web-or-vue-frontend)
- Publish common/** workspaces to [npm](docs/install.md#Publishing-packages-to-npm). **for template maintainers ONLY**

## Creating a New App or Service

Novex Kit provides reference template apps that can be used to quickly create new backend applications and services.

Instead of manually copying an existing application, use the app creation CLI.

### Available Templates

The following templates are currently available:

| Template                | Description                |
| ----------------------- | -------------------------- |
| `vision-rest-app`       | REST API application       |
| `vision-queue-consumer` | Queue consumer application |

Reference template apps live under `apps/` — [`apps/sample-rest-app`](apps/sample-rest-app) and [`apps/sample-queue-consumer`](apps/sample-queue-consumer) — alongside every other app (see [Available Templates](#available-templates) above).

### Create a New App

Run the following command from the repository root:

```bash
npm run create:app
```

The CLI will display the available templates:

```text
🚀 Create new app

Available templates:

  1. vision-rest-app
  2. vision-queue-consumer

Choose template [1-2]:
```

Select the template you want to use, then provide the name of the new application:

```text
Choose template [1-2]: 1

App name: my-new-service
```

The CLI will copy the selected template into the `apps` directory:

```text
apps/
└── my-new-service/
```

The `package.json` inside the new application will also be updated with the application name.

Example output:

```text
📦 Using template: vision-rest-app
📁 Creating: apps/my-new-service

✔ Template copied
✔ package.json updated

✨ Done!

Created:
  apps/my-new-service
```

### Naming Rules

Application names must:

* use lowercase letters
* use numbers when needed
* use hyphens (`-`) to separate words
* start with a letter or number

Valid examples:

```text
payment-service
user-api
notification-worker
order-service-v2
```

Invalid examples:

```text
PaymentService
payment_service
payment service
```

### Adding a New Template

Reference template apps are maintained under `apps/`, alongside every other app.

For example:

```text
apps/
├── sample-rest-app/
└── sample-queue-consumer/
```

To add a new template:

1. Create a new app directory under `apps/`.
2. Add the application starter code.
3. Add or update its `package.json`.
4. Register the template in `create-app.js`.

For example:

```js
const templates = {
  "vision-rest-app": "sample-rest-app",
  "vision-queue-consumer": "sample-queue-consumer",
  "my-new-template": "my-new-template-sample",
};
```

After registering the template, it will automatically become available when running:

```bash
npm run create:app
```

**Important:** the generated application is created under `apps/` and is considered **userland content**. Template maintainers should keep reusable starter code in its own dedicated app under `apps/` (e.g. `sample-rest-app`) rather than modifying a generated application to serve as a future template.

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
