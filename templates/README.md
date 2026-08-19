# Creating a New App or Service

Novex Kit provides application templates that can be used to quickly create new backend applications and services.

Instead of manually copying an existing application, use the app creation CLI.

## Available Templates

The following templates are currently available:

| Template                | Description                |
| ----------------------- | -------------------------- |
| `vision-rest-app`       | REST API application       |
| `vision-queue-consumer` | Queue consumer application |

Templates are located under the `templates/` directory.

## Create a New App

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

## Naming Rules

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

## Adding a New Template

Templates are maintained under the `templates/` directory.

For example:

```text
templates/
├── vision-rest-app-sample/
└── vision-queue-consumer-sample/
```

To add a new template:

1. Create a new directory under `templates/`.
2. Add the application starter code.
3. Add or update its `package.json`.
4. Register the template in `create-app.js`.

For example:

```js
const templates = {
  "vision-rest-app": "vision-rest-app-sample",
  "vision-queue-consumer": "vision-queue-consumer-sample",
  "my-new-template": "my-new-template-sample",
};
```

After registering the template, it will automatically become available when running:

```bash
npm run create:app
```

## Important

The generated application is created under `apps/` and is considered **userland content**.

Template maintainers should keep reusable starter code in `templates/` rather than modifying generated applications to serve as future templates.

For repository conventions, development workflow, and contribution guidelines, see the main [README](../README.md).
