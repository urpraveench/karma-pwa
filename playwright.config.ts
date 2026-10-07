import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Browser tests run against a production build in test mode (localStorage, demo login),
// built into its own folder so it can never be confused with the deployable dist/.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/e2e', open: 'never' }], // npm run test:e2e opens it afterwards
  ],
  outputDir: 'reports/e2e-artifacts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // the installed Google Chrome; no browser download needed
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block', // except in pwa.spec.ts, so cached shells never leak between tests
  },
  projects: [
    // Pin locale and time zone so date formatting is the same on every machine.
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'], channel: 'chrome', locale: 'en-GB', timezoneId: 'Asia/Kolkata' } },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_BACKEND: 'local', VITE_SHOW_DEV_HINT: 'true' },
  },
});
