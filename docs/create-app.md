## Creating a New App or Service

Novex Kit provides reference template apps that can be used to quickly create new backend applications and services.

Instead of manually copying an existing application, use the app creation CLI.

### Available Templates

The following templates are currently available:

| Template                | Description                |
| ----------------------- | -------------------------- |
| `sample-rest-app`       | REST API application       |
| `sample-queue-consumer` | Queue consumer application |

Reference template apps live under `apps/` — [`apps/sample-rest-app-v2`](../apps/sample-rest-app-v2) and [`apps/sample-queue-consumer`](../apps/sample-queue-consumer) — alongside every other app. Both follow the repo's clean architecture (controller → service → repository, strict TypeScript) — see [CLAUDE.md](../.claude/CLAUDE.md#clean-architecture-controller--service--repository).

### Create a New App

Run the following command from the repository root:

```bash
npm run create:app --workspace=apps/sample-common
```

The CLI will display the available templates:

```text
🚀 Create new app

Available templates:

  1. sample-rest-app
  2. sample-queue-consumer

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

The CLI copies the template folder as-is (including any untracked local files in it, such as a `.env`), then sets the `name` in the new app's `package.json` to `@apps/<app-name>`.

Example output:

```text
📦 Using template: sample-rest-app
📁 Creating: apps/my-new-service

✔ Template copied
✔ package.json updated

✨ Done!

Created:
  apps/my-new-service

Run:
  npm run start --workspace apps/my-new-service
```

### After Creating the App

1. Run `npm install` from the repository root — the new folder is picked up by the `apps/*` workspace glob, and this links it and records it in `package-lock.json` (commit the lockfile change with the app).
2. If the template has a `.env.sample` (`sample-rest-app` does), copy it to `.env` in the new app and fill it in. Never commit secrets — inject them from environment variables or a secret manager outside development.
3. Start it: `npm run start --workspace apps/my-new-service`.

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
├── sample-rest-app-v2/
└── sample-queue-consumer/
```

To add a new template:

1. Create a new app directory under `apps/`.
2. Add the application starter code.
3. Add or update its `package.json`.
4. Register the template in [`apps/sample-common/create-app.js`](../apps/sample-common/create-app.js).

For example:

```js
const templates = {
  "sample-rest-app": "sample-rest-app-v2",
  "sample-queue-consumer": "sample-queue-consumer",
  "my-new-template": "my-new-template-sample",
};
```

After registering the template, it will automatically become available when running:

```bash
npm run create:app --workspace=apps/sample-common
```

**Important:** the generated application is created under `apps/` and is considered **userland content**. Template maintainers should keep reusable starter code in its own dedicated app under `apps/` (e.g. `sample-rest-app-v2`) rather than modifying a generated application to serve as a future template.

### Or Copy `sample-api`

For an Express app on the shared `preRoute()` / `postRoute()` setup (plain JS/TS, not the strict clean-architecture templates):

1. Copy `apps/sample-api` to a new folder in `apps/`, named in kebab-case (same [naming rules](#naming-rules)), and set `name` in its `package.json` (e.g. `@apps/my-service`).
2. Edit `.env.json` (non-sensitive structured settings) and `.env.local` / `.env` (development secrets) in the new folder. Outside development, inject secrets from environment variables or a secret manager — never commit them.
3. Run `npm install` from the repository root to link the new workspace.

Never develop directly in `sample-api` or any other `sample-*` template — copy it first.

---

## Creating a New Frontend App

There's no CLI for frontends — copy one of the two Vue templates. Pick the one that matches your needs:

| Template | Use when |
|---|---|
| [`apps/sample-vue-full`](../apps/sample-vue-full) | Building a full app — routing, auth views, UI framework, state, monitoring and mocking already wired |
| [`apps/sample-vue-minimal`](../apps/sample-vue-minimal) | Starting from scratch or building a micro-frontend — just Vue + Vite |

**`sample-vue-full` includes:** Vue Router with a public/secure layout split, Pinia, Ant Design Vue, Sentry error monitoring, MSW (Mock Service Worker) for API mocking in development, PWA support, a Playwright e2e setup, and pre-built sign-in, sign-up, dashboard and OAuth callback views.

**`sample-vue-minimal` includes:** Vue + Vite only — a single `App.vue` + `Hello.vue`, no router, UI framework or state management.

To create the app:

1. Copy the chosen template to a new folder in `apps/`, named in kebab-case, and set `name` in its `package.json`.
2. Edit its environment files:
   - `.env` — common to every environment (local, not committed)
   - `.env.[MODE]` — per mode, picked by `npx vite build --mode <mode>`; the default mode is `development` (`.env.development`); `sample-vue-full` also has `.env.mocked` for MSW
3. Run `npm install` from the repository root.
4. `sample-vue-full` only — menu routes are defined in the `ROUTES` property:
   - Use kebab-case; paths are converted to capitalized menu labels in the UI.
   - Only one submenu level: `/first-level`, `/submenu/second-level`.
   - Component paths are relative to `setups/` (e.g. `'../views/SignIn.vue'`) or use the `@common/vue` alias (e.g. `'@common/vue/views/...'`).

Never develop directly in the `sample-vue-*` templates — copy them first. Running the templates themselves: [install.md](install.md#run-minimal-vue-application).

