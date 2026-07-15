## Apps to install for development (MacOS)

```bash
# homwbrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
brew –version

# XCode Select - installs git
xcode-select --install
xcode-select --version

# Podman
brew install podman
podman machine init && podman machine start && podman info
sudo /opt/homebrew/Cellar/podman/5.8.1/bin/podman-mac-helper install
podman machine stop; podman machine start

# nvm, node and npm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
# restart shell required to use
# export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# VS Code
brew install --cask visual-studio-code
brew uninstall --cask --zap visual-studio-code
$HOME/Library/Application\ Support/Code
~/.vscode
~/Library/Caches/com.microsoft.VSCode
brew list visual-studio-code 
brew autoremove
```

VS Code extensions are found in [.vscode/extensions.json](). Manually maintained. Copilot chat already built into latest VS Code.

```bash
# command line install of extenisions
code --install-extension <extension id>
```

---

## Run Sample API

1. Install the dependencies

```bash
npm i
```

2. Create and populate file-based pglite (serve as pg) database

If sample database at `db/dev.db` folder is not present, see [Quick Create DB](../db/README.md#quick-create-db) to generate one. Due to size, the DB is not commited to git.

For local development, run `npm run serve` command in `scripts/db-mocks` folder to serve the database.

3. Run the sample api application

```bash
cd apps/sample-api
npm run start
```

4. Visit the following URLs

- http://127.0.0.1:3000/api/healthcheck - API is running normally
- http://127.0.0.1:3000 - Website served by Express with functional samples and demos
- http://127.0.0.1:3000/native/index.html - unbundled Vue website sample

**Notes**

- No bundler frontend
  - Imports only `vue` and `vue-router` in `index.html`, with plain JavaScript and no bundler.
  - Uses `export const store = reactive({})` [instead of Vuex](https://pinia.vuejs.org/introduction.html#Why-should-I-use-Pinia).


5. Running Using Docker/Podman

For running with Docker or Podman:

```bash
docker build -t novex-kit --target production --build-arg APP_NAME=sample-api --build-arg API_PORT=3000 .
docker run -p 3000:3000 novex-kit
```

Features include SAML, OIDC, OAuth, FIDO2 login, and push notifications.

## Create New Backend App Or Service

- Make a copy of the `sample-api` folder in the `apps` folder and rename it using kebab-case.
- Edit the `.env` and `.env.json` files as needed. For production, inject secrets from environment variables or a secret manager.


---


## Run Minimal Vue Application

```bash
npm i
cd apps/sample-vue-minimal
npm run dev
```

Visit `http://127.0.0.1:8080` on browser to view application

## Install & Run Sample Vue Application

Run a more extensive sample, in `apps/sample-vue-full`, and view on `http://127.0.0.1:8081`

**Note For Login**

Login using one of the following:  
- Faked Login: [NOTE: API calls to protected Endpoints WILL FAIL!]:
  - Login: fake a user and login, no backend needed, just click button
  - Login Callback: fake a callback and set fake user and login, no backend needed, just click button
- Login: normal login with OTP, express server needs to be run
  - Details are already **prefilled** with the following values; just click the Login button.
  - Username and password: `test`
  - OTP (if enabled, for example `USE_OTP=TEST`): use `111111`; it is already prefilled.
- Enterprise SSO (SAML2, OIDC) is available in the sample app.

### E2E Tests

```bash
npx playwright install chromium
npx playwright test --browser=chromium

cd apps/sample-vue-full
npm run test:e2e
```

### Run With Mock Service Worker

```bash
# TODO
npm run local:mocked # run locally with mock service worker (many other API calls will fail because they are not mocked)
```
---

## Create New Web or Vue Frontend

- Make a copy of the `sample-vue-full` folder in the `apps` folder and rename it using kebab-case.
- Edit the `.env` and `.env.development` files as needed.
  - `.env` is common to all environments for the app
  - `.env.[MODE]` indicates the environment file to use (command to use: npx vite build --mode $1). default is `development`
- `apps/sample-vue-full` is a sample skeleton that can be used as scaffolding
  - `ROUTES` property
    - Use kebab-case; it will be converted to capitalized menu labels in the UI.
    - only up to 1 submenu level
      - /first-level
      - /submenu/second-level
    - Paths:
      - `'~/xxx.js'` from the **<project>/src** folder
      - `'/xxx.js'` from the **<project>** folder

---

## Common Workspaces Install

The `common` workspaces contain reusable shared code and schemas for use across applications in this monorepo.

- [common/vanilla/iso](../common/vanilla/iso) - isomorphic utilities that can run across multiple JavaScript runtimes
- [common/compiled/node](../common/compiled/node) - Node.js runtime modules, including Express-specific middleware and services
- [common/schemas](../common/schemas) - shared schemas written in `zod`
- [common/vanilla/web](../common/vanilla/web) - browser-only utilities and web components
- [common/compiled/vue](../common/compiled/vue) - Vue-specific shared modules
- [scripts](../scripts) - repository scripts for database deployment, OpenAPI generation, and related tooling


### Workspace Command Reference

- List workspaces: `npm ls -ws`
- Install by workspace: `npm i @node-saml/node-saml@latest --workspace=common/node`
- Check outdated packages: `npm outdated -ws`
- Update packages: `npm update --save`

### Publishing packages to npm

- Run `npm publish` from the CLI first if the package has not been published before.
- Start at version `0.0.1`.
- When updating a package:
  - **IMPORTANT** before publish, bump version in each project using `npm version` command (see npm version --help for explanation)
  - npm publish --access public --workspace=<workspace>
  
**NOTE** Use `--access public` because the package is scoped and published on a free plan.

Or publish using GitHub Actions with [.github/workflows/deploy-npm.yml](../.github/workflows/deploy-npm.yml). Add the npm auth token to GitHub Secrets first.


### Sample Deployment

1. Configure `.env.prd`.
2. Run the workflow [.github/workflows/deploy-bucket.yml](../.github/workflows/deploy-bucket.yml) and select the production environment.

### References
- https://ideas.digitalocean.com/storage/p/deploy-static-sites-to-spacescdn
- https://docs.digitalocean.com/products/spaces/reference/s3-compatibility
- https://es-labs.sgp1-static.digitaloceanspaces.com
