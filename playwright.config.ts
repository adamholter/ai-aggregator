import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:8765',
    headless: true,
  },
  webServer: {
    command: 'PORT=8765 python3 server.py',
    url: 'http://127.0.0.1:8765/api/health',
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
