import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm web',
    port: 8081,
    timeout: 120_000,
    reuseExistingServer: true,
    cwd: '..',
  },
});
