import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testIgnore: 'production.spec.ts', expect: { timeout: 20000 }, fullyParallel: true, workers: 2,
  use: { ...devices['Pixel 7'], browserName: 'chromium', baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite build --mode e2e && npm run preview -- --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 120000 },
});
