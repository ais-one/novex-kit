## Read Me FIRST!

**Important notes** - **TO UPDATE!**
- DO NOT develop custom code using `apps/sample-vue-full` or `apps/sample-vue-minimal`. Rename it or copy it to another folder name
- do note any conflicts to resolve when merging from upstream

---

## Install & Run & E2E Test

```bash
npm i
cd apps/sample-vue-full
npm run dev # run 1st sample web application in <project root>/apps/sample-vue-full
```

# Visit `http://127.0.0.1:8080` to view application

**Note For Login**

Login using one of the following:
- Faked Login: [NOTE: API calls to protected Endpoints WILL FAIL!]:
  - Login: fake a user and login, no backend needed, just click button
  - Login Callback: fake a callback and set fake user and login, no backend needed, just click button
- Login: normal login with OTP, express server needs to be run
  - details already **prefilled** with following values, just click on Login button
  - User and password is `test`
  - OTP (if enabled - e.g. USE_OTP=TEST): use 111111 as otp pin, already prefilled, click on OTP button
- Enterprise SSO (SAML2, OIDC) refer to [https://github.com/ais-one/novex-kit#saml-oidc-oauth]() for info

[TODO] E2E Tests:

```bash
npx playwright install chromium
npx playwright test --browser=chromium

cd apps/sample-vue-full
npm run test:e2e
```

[TODO] Run with MockServiceWorker

```bash
# TODO
npm run local:mocked # run locally with mock service worker (many other API calls will fail because they are not mocked)
```

---

## Frontend Custom Application Notes

Setting up your custom frontend

**Notes:**
- `apps/sample-vue-full` is a sample skeleton that can be used as scaffolding
  - `ROUTES` property
    - use kebab-case, will be converted to Capital Case in menu display
    - only up to 1 submenu level
      - /first-level
      - /submenu/second-level - paths
      - '~/xxx.js' from **<project>/src** folder
      - '/xxx.js' from **<project>** folder
- **IMPORTANT NOTE** When you create a new application
  - create it in the `apps` folder
