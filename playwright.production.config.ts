import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base, testIgnore: [], testMatch: 'production.spec.ts', workers: 1,
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 120000 },
});
