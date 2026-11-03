import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'fixtures/**',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    viewport: { width: 1280, height: 800 },
    browserName: 'chromium',
  },
  webServer: [
    {
      // Le vrai serveur sert le build, en mode mock et sans mot de passe.
      command: 'npx vite build && npx tsx server/index.ts',
      url: 'http://127.0.0.1:5199/healthz',
      reuseExistingServer: false,
      env: { HERMES_MODE: 'mock', PORT: '5199', HOST: '127.0.0.1' },
      timeout: 120_000,
    },
    {
      // Le vrai serveur en mode live, face au faux Hermes écrit d'après le source.
      command: 'npx tsx e2e/fixtures/live-stack.ts',
      url: 'http://127.0.0.1:5198/healthz',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
