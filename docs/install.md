## Apps to install for development (MacOS)

```bash
# homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
brew --version

# XCode Select - installs git
xcode-select --install
xcode-select --version

# Podman
brew install podman
podman machine init && podman machine start && podman info
sudo "$(brew --prefix podman)/bin/podman-mac-helper" install
podman machine stop; podman machine start

# nvm, node and npm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
# restart shell required to use
# export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# VS Code
brew install --cask visual-studio-code

# optional: full uninstall / cleanup — do not paste with the install line above
# brew uninstall --cask --zap visual-studio-code
# leftover folders to delete manually if needed:
#   $HOME/Library/Application\ Support/Code
#   ~/.vscode
#   ~/Library/Caches/com.microsoft.VSCode
# brew list visual-studio-code
# brew autoremove
```

VS Code extensions are found in [.vscode/extensions.json](../.vscode/extensions.json). Manually maintained. Copilot chat already built into latest VS Code.

```bash
# command line install of extensions
code --install-extension <extension id>
```

---

## Run Sample API

1. Install the dependencies

```bash
npm i
```

2. Create and populate file-based pglite (serve as pg) database

If sample database at `db/dev.db` folder is not present, see [Quick Start](../db/README.md#quick-start-local-dev) to generate one. Due to size, the DB is not committed to git.

For local development, run `npm run serve` command in `scripts/db-mocks` folder to serve the database.

3. Run the sample api application

```bash
cd apps/sample-api
npm run start
```

4. Visit the following URLs

| URL | Purpose |
|---|---|
| http://127.0.0.1:3000/health | Shared health check — mounted before auth, always unauthenticated |
| http://127.0.0.1:3000/api/sample-api/healthcheck | App-level health check (the app's own routes are mounted) |
| http://127.0.0.1:3000 | Website served by Express with functional samples and demos |
| http://127.0.0.1:3000/native/index.html | Unbundled Vue website sample |

**Notes**

- No bundler frontend
  - Imports only `vue` and `vue-router` in `index.html`, with plain JavaScript and no bundler.
  - Uses `export const statex = reactive({})` [instead of Vuex](https://pinia.vuejs.org/introduction.html#Why-should-I-use-Pinia).


5. Running Using Docker/Podman

Build from the **repository root** (the build needs the whole monorepo):

```bash
docker build -t novex-kit \
  --target runtime \
  --build-arg APP_NAME=sample-api \
  --build-arg API_PORT=3000 \
  -f apps/sample-api/Dockerfile .

docker run -p 3000:3000 novex-kit
```

`podman` takes the same commands. `apps/base-iam` and `apps/cron` have their own Dockerfiles with the same stages and build args, and they default `APP_NAME` and `API_PORT` to their own values (3001 and 4000), so `-f apps/<app>/Dockerfile` alone is enough. CI builds and pushes images with [deploy-cr.yml](../.github/workflows/deploy-cr.yml).

Features include FIDO2 login and push notifications. SAML/OIDC/OAuth login lives in [`apps/base-iam`](../apps/base-iam).

## Create New Backend App Or Service

Use the `create:app` CLI or copy `sample-api` — see [create-app.md](create-app.md).

---

## Run Minimal Vue Application

```bash
npm i
cd apps/sample-vue-minimal
npm run dev
```

Visit `http://127.0.0.1:8081` on browser to view application

## Install & Run Sample Vue Application

Run a more extensive sample, in `apps/sample-vue-full`, and view on `http://127.0.0.1:8080`

**Note For Login**

Login using one of the following:  
- Faked Login: [NOTE: API calls to protected Endpoints WILL FAIL!]:
  - Login: fake a user and login, no backend needed, just click button
  - Login Callback: fake a callback and set fake user and login, no backend needed, just click button
- Login: normal login with OTP — run `apps/base-iam` (port 3001, `VITE_AUTH_URL` in `.env.development`)
  - Details are already **prefilled** with the following values; just click the Login button.
  - Username and password: `test`
  - OTP (if enabled, for example `USE_OTP=TEST`): use `111111`; it is already prefilled.
- Enterprise SSO (SAML2, OIDC) is served by `apps/base-iam` (see [docs/design/authn.md](design/authn.md)).

### E2E Tests

```bash
cd apps/sample-vue-full
npx playwright install chromium
npx playwright test --browser=chromium
# note: `npm run test:e2e` is only a reminder stub (run frontend + backend first) — it runs no tests
```

### Run With Mock Service Worker

```bash
# TODO: currently broken — the script points at apps/vite.config.js, which doesn't exist
npm run dev:mocked # run locally with mock service worker (many other API calls will fail because they are not mocked)
```
---

## Create New Web or Vue Frontend

Copy `sample-vue-full` or `sample-vue-minimal` — see [create-app.md → Creating a New Frontend App](create-app.md#creating-a-new-frontend-app).

---

## Common Folders

What each `common/*` folder is, its import name and whether it's an npm workspace: [structure.md → common](structure.md#common). Full repo layout: [structure.md](structure.md).

### Command Reference

Root `npm run` scripts (from the root `package.json`):

| Script | What it does |
|---|---|
| `check` | Biome check, no writes — run before committing |
| `check:write` | Biome check with `--write` — auto-fixes lint and format |
| `ci:biome` | `biome ci .` — what the `format-lint` step of CI `Lint / Lint Check` runs |
| `ci:lint-yml` | prettier check of `.github/workflows/*.yml` and `.github/actions/**/*.yml` (the `lint-github-yaml` step of CI `Lint / Lint Check`); fix with `npx prettier --write` on the same globs |
| `ci:audit` | `npm audit --audit-level=high --omit=dev` (CI `Quality / NPM audit`) |
| `ci:dup` | jscpd duplication check (CI `Quality / Duplication Check`) |
| `test:workspaces` | `npm run test` in every workspace that has a `test` script |
| `test:schemas` | zod schema export tests for a folder — `npm run test:schemas -- common/schemas` (run by the pre-commit hook) |
| `test:e2e` | `start-server-and-test` against `http://localhost:8080` |
| `prepare` | runs `.githooks/setup.sh` — automatic on `npm install`, re-run to re-apply the git hooks |
| `clean:all` | **deletes every `node_modules` and every `package-lock.json`** in the repo — reinstall with `npm i` afterwards |
| `git:hash` / `git:branch` | print the current short commit hash / branch |
| `update-commit-hash` | write the short commit hash to a `commit-hash` file |

Workspace management:

- List workspaces: `npm ls -ws`
- Install into a workspace (always from the root): `npm i @node-saml/node-saml@latest --workspace=common/compiled/node`
- Check outdated packages: `npm outdated -ws`
- Update packages within their ranges: `npm update --save`
- Run a script in one workspace: `npm run <script> --workspace=<path>`
- Coverage locally: `npm run test:unit --workspace=<path>` (prints a coverage table); the merged lcov report is produced in CI (the `unit` step of `Tests / Test Check`)

OpenAPI docs are generated per package, not from the root: `cd common/schemas && npm run docs:generate` for the shared schemas (output `common/schemas/docs/openapi/openapi.merged.yaml`), or `npm run docs:generate` inside `db/<schema>/` for that schema's CRUD docs — see [scripts/generators/README.md](../scripts/generators/README.md).

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
2. Run the workflow [.github/workflows/deploy-bucket.yml](../.github/workflows/deploy-bucket.yml) and set the `env` input to `prd`.

### References
- https://ideas.digitalocean.com/storage/p/deploy-static-sites-to-spacescdn
- https://docs.digitalocean.com/products/spaces/reference/s3-compatibility
- https://es-labs.sgp1-static.digitaloceanspaces.com
