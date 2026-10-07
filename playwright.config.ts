import { defineConfig, devices } from '@playwright/test';

const LOCAL_PORT = 4173, FIREBASE_PORT = 4175, GOOGLE_PORT = 4176;
// firebase-tools needs Java 21+. Homebrew's keg-only openjdk@21 is used when present; otherwise `java` on PATH.
const JAVA21 = 'PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH';
const phone = { ...devices['Pixel 7'], channel: 'chrome', locale: 'en-GB', timezoneId: 'Asia/Kolkata' };

// Browser tests run against production builds, each in its own folder so neither can be confused
// with the deployable dist/:
//   test mode     (localStorage, demo login)            -> dist-e2e,          port 4173
//   firebase mode (local Auth + Firestore emulators)    -> dist-e2e-firebase, port 4175
//   firebase mode with Google sign-in switched on        -> dist-e2e-google,   port 4176
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
    channel: 'chrome', // the installed Google Chrome; no browser download needed
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block', // except in pwa.spec.ts, so cached shells never leak between tests
  },
  projects: [
    // Locale and time zone are pinned so date formatting is the same on every machine.
    { name: 'Test mode', testIgnore: ['firebase/**', 'firebase-google/**'], use: { ...phone, baseURL: `http://localhost:${LOCAL_PORT}` } },
    // Emulator-backed projects retry once: a rare emulator slowdown is reported as "flaky" instead of failing the run.
    { name: 'Firebase mode', testMatch: 'firebase/**/*.spec.ts', retries: 1, use: { ...phone, baseURL: `http://localhost:${FIREBASE_PORT}` } },
    { name: 'Firebase + Google', testMatch: 'firebase-google/**/*.spec.ts', retries: 1, use: { ...phone, baseURL: `http://localhost:${GOOGLE_PORT}` } },
  ],
  webServer: [
    {
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${LOCAL_PORT} --strictPort`,
      url: `http://localhost:${LOCAL_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_BACKEND: 'local', VITE_SHOW_DEV_HINT: 'true' },
    },
    {
      command: `${JAVA21} firebase emulators:start --only auth,firestore --project demo-tiktym`,
      url: 'http://127.0.0.1:9099', // Auth lives in the CLI process, so a leftover Firestore java process can't fake readiness
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Ctrl+C-style stop, so the CLI shuts down its Firestore java process instead of orphaning it on the port
      gracefulShutdown: { signal: 'SIGINT', timeout: 15_000 },
    },
    {
      command: `npx vite build --outDir dist-e2e-google --emptyOutDir && npx vite preview --outDir dist-e2e-google --port ${GOOGLE_PORT} --strictPort`,
      url: `http://localhost:${GOOGLE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_BACKEND: 'firebase', VITE_USE_EMULATORS: 'true', VITE_ENABLE_GOOGLE: 'true',
        VITE_FIREBASE_API_KEY: 'fake-api-key', VITE_FIREBASE_PROJECT_ID: 'demo-tiktym', VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
      },
    },
    {
      command: `npx vite build --outDir dist-e2e-firebase --emptyOutDir && npx vite preview --outDir dist-e2e-firebase --port ${FIREBASE_PORT} --strictPort`,
      url: `http://localhost:${FIREBASE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_BACKEND: 'firebase', VITE_USE_EMULATORS: 'true', VITE_ENABLE_GOOGLE: 'false',
        VITE_FIREBASE_API_KEY: 'fake-api-key', VITE_FIREBASE_PROJECT_ID: 'demo-tiktym', VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
      },
    },
  ],
});
