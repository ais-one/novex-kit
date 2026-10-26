# NodeJS

## nvm

Use `nvm` to manage nodeJS versions.

Installation

```bash
# use curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# or wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Setup .bashrc or .zshrc

```bash
# determine shell
echo $0

# .bashrc or .zshrc
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
export PATH=/usr/local/bin:$PATH

nvm install --lts
nvm use --lts
```

## pm2

Use on dev servers to run node apps perpetually

```bash
npm install -g pm2
```

## App Design Considerations

https://12factor.net/

Always Learning. Always Work In Progress

> https://www.udemy.com/nodejs-the-complete-guide/learn/v4/t/lecture/12198026?start=0 > https://www.udemy.com/nodejs-the-complete-guide/learn/v4/t/lecture/12198028?start=0 > https://www.udemy.com/nodejs-the-complete-guide/learn/v4/t/lecture/12198030?start=0

# ExpressJS Notes

Do not rely on req object, e.g. putting mongo, redis, etc. objects in req as you may also need them in websockets

Do not add to app object because app is not global and needs to be exported for other modules to use

## Logging & Application Performance Monitoring

Choose to do in application or hand-off to 3rd party

https://github.com/expressjs/morgan
https://github.com/winstonjs/winston - use console.log / console.error and send to streams instead
https://blog.heroku.com/best-practices-nodejs-errors
https://itnext.io/nodejs-logging-made-right-117a19e8b4ce
https://www.coreycleary.me/should-you-use-a-logging-framework-or-console-log-in-node/

https://googleapis.dev/nodejs/logging-winston/latest/index.html

## Proxying, Compression, Rate-Limiting

Choose to do in application or use Nginx / Apache, or API gateway

https://github.com/chimurai/http-proxy-middleware
https://github.com/nfriedly/express-rate-limit
https://github.com/nfriedly/express-slow-down

## Security

### JWT

- http://self-issued.info/docs/draft-ietf-oauth-v2-bearer.html#ExAccTokResp
- https://stackoverflow.com/questions/42917170/setting-the-httponly-attribute-for-the-nodejs-cookie-header

### OAuth2/OAuth Setups

- http://thecodebarbarian.com/github-oauth-login-with-node-js.html
- https://dev.to/aidanlovelace/how-to-setup-google-oauth2-login-with-express-2d30
- https://www.sohamkamani.com/blog/javascript/2018-06-24-oauth-with-node-js
- https://www.loginradius.com/blog/async/oAuth-implemenation-using-node

### Express Libraries For Security

- helmet (to configure), csurf
- url-regex, path-to-regexp (to filter paths)

### JWT, HTTPONLY REFRESH TOKEN

- auto refresh
- revokable (requires state)
- support HttpOnly cookies

### CORS

- support cross origin requests

## Libraries Of Note (not used currently)

qrcode
cron
ioredis
uuid
busboy, formidable

## Message Queues

- https://github.com/agenda/agenda - mongodb
- https://github.com/OptimalBits/bull - redis
- https://github.com/taskforcesh/bullmq - redis

## SQL

- https://dev.to/helenanders26/sql-series-from-a-to-z-2pk9
- https://dev.to/helenanders26/sql-series-speed-up-your-queries-with-indexes-3c83
- https://dev.to/helenanders26/sql-series-all-about-sql-joins-15ol

## SSE

- https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app

## NPM corruption

1. delete node_modules
2. delete package-lock.json ???
3. npm cache clean --force

## NPM wierdness

1. pre and post on package.json scipts

package.json
{
"scripts": {
"abc:xyz": "echo 1",
"preabc:xyz": "echo 2",
"postabc:xyz": "echo 3",
"qweabc:xyz": "echo 4"
}
}

What is the output for

npm run abc:xyz

2. editing on library file on vs-code

"dependencies": {
"@ais-one/esm": "file:../@ais-one/esm",

If you edit the file in ../@eslabs/..., it will also be changed the installed node_modules

3. installing from git

"dependencies": {
"@ais-one/node": "github:ais-one/node#<tag>",
"@ais-one/node": "github:ais-one/node#<branch_name>",

You need to create `tag` on the github remote also by creating a new release or you can use a branch instead

## Shutdown

- NodeJS app & express
  - https://shapeshed.com/uncaught-exceptions-in-node/
  - https://www.joyent.com/node-js/production/design/errors
  - https://blog.heroku.com/best-practices-nodejs-errors
  - https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
- signals: http://man7.org/linux/man-pages/man7/signal.7.html
- node signal events: https://nodejs.org/dist/latest-v11.x/docs/api/processhtml#process_signal_events
- kubernetes shutdown: https://cloud.google.com/blog/products/gcp/kubernetes-best-practices-terminating-with-grace

## performance

- https://blog.logrocket.com/optimize-node-js-performance-with-clustering/
- https://blog.logrocket.com/customizing-node-js-env-files/
- TODO workerthreads

## Security

- https://semaphoreci.medium.com/best-practices-for-securing-node-js-applications-in-production-d24b7c4981d




npm version patch

[package.json](https://docs.npmjs.com/cli/v7/configuring-npm/package-json)

```json
{
  "files": ["build/**/*"]
}
```

---

# NPM

## npm workspaces

### References:

- https://github.com/ruanmartinelli/npm-workspaces-demo
- https://hyperfoo.io/posts/npm-7-workspaces-1

1. package name is important (note scoped packages)
2. not peer dependency issues in NPM 8
3. may need to add scope
4. npm i --workspace=<a-workspace>

npm prejects with no dependencies, for testing

- vtextpad
- complex.js
- fraction.js
- zero-fill
- padder
- smiley


## Installing & Updating Dependencies

Install dependencies for all workspaces!

- when doing npm i, it will always install latest version matching your package
- sometimes you need to **rebuild**, delete all node_modules folders and the package-lock.json file in the root

```bash
# https://github.com/npm/cli/issues/708
# https://github.com/npm/cli/issues/2032
npm i # use this
# npm i --legacy-peer-deps # use this if there is peer dependencies issues, but not recommended
```

Update dependencies for all workspaces!

```bash
npm outdated # use this to check for outdated dependencies
npm update --save
npm ls <?package> # use npm ls to check on actual versions installed
```

## Workspace commands

```bash
# install a package in a workspace
npm i lorem-ipsum --workspace=@<namespace>/[package] # is @ needed?

# install all packages in a workspace
npm i --workspace=js-<namespace>

# Update a package with major version change eg 2.2.8 to 3.1.1
npm i ant-design-vue@latest --workspace=<namespace>/[package]

# To install all workspaces
npm i --workspaces
```

---

## NPM Token

Create token

- for automation fine grain and limit its access

# SQA NodeJS

The following development dependencies are using to assist in SQA in NodeJS

- git hooks: native git precommit hooks
- format + lint: biome (vs eslint + prettier)
- commit lint: czg (vs commitizen)
- versioning & release: git-cliff

## A list of Software Quality Assurance Tools

- CICD: Github Actions
- Dependency Security: Snyk [https://snyk.io/plans]
- Code Quality Analysis: Sonarcloud [https://sonarcloud.io]

## CI/CD - Github

- https://github.com/ajinabraham/NodeJsScan - SAST
- https://github.com/zaproxy/zaproxy - DAST
- https://prometheus.io/ - monitoring

---

## Application Performance Monitoring APM & Logging

Research In Progress

- https://sentry.io/welcome/
- https://www.appdynamics.com/
- https://www.datadoghq.com/
- https://newrelic.com/
- https://logrocket.com/
- https://www.splunk.com/
- https://raygun.com/
- https://rollbar.com/

## User Behaviour Analysis

Analyze user behavior across your sites and apps

- MixPanel https://mixpanel.com/home/
- Google Analytics
