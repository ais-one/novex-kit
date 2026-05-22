const config = {
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-cy',
  },
  webServer: {
    command: 'npm run dev:mocked',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
};

module.exports = config;
