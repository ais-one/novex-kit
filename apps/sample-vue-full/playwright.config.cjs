const config = {
  testDir: './__tests__/e2e',
  use: {
    baseURL: 'http://localhost:8080',
    browserName: 'chromium',
    // screenshot: 'only-on-failure', // on, off, only-on-failure
    headless: true,
  },
};

module.exports = config;
