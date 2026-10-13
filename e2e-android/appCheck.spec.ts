import { expect, test, type AndroidDevice } from '@playwright/test';
import { connect, launch, newAccount } from './helpers';

// App Check in the Android app (AND-04): the app's Firebase calls carry the token from Android's own App Check (the debug
// provider in this build, Play Integrity in the Play build). The emulator has no registered debug secret, so the test answers
// the native App Check calls at the Capacitor bridge, from before the page's own scripts run; the Firebase emulators don't
// check the token, so the test reads it off the app's requests.

const TOKEN = 'android-app-check-token';

let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.afterAll(async () => { await device?.close(); });

test('the app\'s Firebase requests carry the token from Android\'s App Check, started once with the debug provider (AND-04)', async () => {
  const { email, password } = await newAccount();
  const page = await launch(device);
  await page.addInitScript(token => {
    type Native = (plugin: string, method: string, options: unknown) => Promise<unknown>;
    type Cap = { nativePromise?: Native; hooked?: boolean };
    const w = window as unknown as { Capacitor?: Cap; appCheckCalls: unknown[] };
    w.appCheckCalls = [];
    // Capacitor's bridge may set window.Capacitor and its nativePromise before or after this script, so catch both.
    const hook = (cap: Cap | undefined) => {
      if (!cap || cap.hooked) return cap;
      cap.hooked = true;
      let real = cap.nativePromise;
      Object.defineProperty(cap, 'nativePromise', {
        configurable: true,
        get: () => (plugin: string, method: string, options: unknown) => {
          if (plugin !== 'FirebaseAppCheck') return real!(plugin, method, options);
          w.appCheckCalls.push([method, options]);
          return Promise.resolve(method === 'getToken' ? { token, expireTimeMillis: Date.now() + 3_600_000 } : undefined);
        },
        set: (fn: Native) => { real = fn; },
      });
      return cap;
    };
    let current = hook(w.Capacitor);
    Object.defineProperty(w, 'Capacitor', { configurable: true, get: () => current, set: v => { current = hook(v); } });
  }, TOKEN);
  await page.reload();
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 30_000 });

  const headers: (string | undefined)[] = [];
  page.on('request', r => { if (r.url().includes('127.0.0.1:9099')) headers.push(r.headers()['x-firebase-appcheck']); });
  await page.fill('#em', email);
  await page.fill('#pw', password);
  await page.click('button[type=submit]');
  await expect(page.locator('.hello, .first-run')).toBeVisible({ timeout: 30_000 });

  expect(headers.length).toBeGreaterThan(0);
  expect(headers.every(h => h === TOKEN)).toBe(true);
  const calls = await page.evaluate(() => (window as unknown as { appCheckCalls: [string, unknown][] }).appCheckCalls);
  expect(calls[0]).toEqual(['initialize', { debugToken: true, isTokenAutoRefreshEnabled: true }]);
  expect(calls.filter(([m]) => m === 'initialize')).toHaveLength(1);
});
