import { defineConfig } from '@playwright/test';

// The Android app's tests (`npm run test:android`): they drive the app's WebView inside a running Android emulator
// through adb, against the local Firebase emulators. Build the test app first with `npm run android:build:test`.
const JAVA21 = 'PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH';

export default defineConfig({
  testDir: 'e2e-android',
  workers: 1, // one emulator, one app
  timeout: 120_000,
  reporter: [['list']],
  outputDir: 'reports/e2e-android-artifacts',
  webServer: {
    command: `${JAVA21} firebase emulators:start --only auth,firestore --project demo-tiktym`,
    url: 'http://127.0.0.1:9099',
    reuseExistingServer: true,
    timeout: 180_000,
    gracefulShutdown: { signal: 'SIGINT', timeout: 15_000 },
  },
});
