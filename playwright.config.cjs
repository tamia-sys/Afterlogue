const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 25_000 },
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://tamia-sys.github.io/Afterlogue/',
    browserName: 'chromium',
    // The repository is public. Never upload screenshots/traces of a signed-in account.
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
});
