const { defineConfig } = require('@playwright/test');

// Run browser checks against the exact checkout under test, not GitHub Pages.
// Set AFTERLOGUE_BASE_URL only for an explicitly requested deployed-site check.
const baseURL = process.env.AFTERLOGUE_BASE_URL || 'http://127.0.0.1:4173/';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 25_000 },
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    // The repository is public. Never upload screenshots/traces of a signed-in account.
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  webServer: process.env.AFTERLOGUE_BASE_URL ? undefined : {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
