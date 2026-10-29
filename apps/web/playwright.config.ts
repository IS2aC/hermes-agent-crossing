import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  outputDir: '../../test-results',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173', screenshot: 'off', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 30_000 },
});
