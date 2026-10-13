import { readFileSync } from 'node:fs';
import { expect, test, type AndroidDevice } from '@playwright/test';
import { connect, launch, newAccount, PKG, signIn } from './helpers';

// Updates and install prompts in the Android app (AND-06): Play delivers updates, so the web's "New version ready" bar
// never shows; the app is installed by definition, so nothing asks to add it to the home screen; and Setup › About,
// Android and Play all show package.json's version.

const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version as string;

let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.beforeEach(async () => {
  await device.shell(`pm clear ${PKG}`);
  await device.shell(`pm grant ${PKG} android.permission.POST_NOTIFICATIONS`); // no notification dialog over the app
});
test.afterAll(async () => { await device?.close(); });

test('no "New version ready" bar, even when a newer build is live, and the app never asks for version.json (AND-06)', async () => {
  const page = await launch(device);
  await page.addInitScript(() => {
    const w = window as unknown as { versionChecks: number };
    w.versionChecks = 0;
    const real = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (String(input instanceof Request ? input.url : input).includes('version.json')) {
        w.versionChecks++;
        return Promise.resolve(new Response(JSON.stringify({ version: '99.0.0', commit: 'newer', builtAt: new Date().toISOString() })));
      }
      return real(input, init);
    };
  });
  await page.reload();
  await signIn(page, await newAccount());
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // the web checks again when shown
  await page.waitForTimeout(1500);
  await expect(page.locator('.update-bar')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { versionChecks: number }).versionChecks)).toBe(0);
});

test('Setup › About shows the version Android shows, and nothing asks to add TikTym to the home screen (AND-06)', async () => {
  const page = await launch(device);
  await signIn(page, await newAccount());
  await page.locator('.tab', { hasText: 'Setup' }).click();
  await expect(page.locator('.li.about')).toContainText(`TikTym ${VERSION}`);
  await expect(page.getByText('Add TikTym to your home screen')).toHaveCount(0);
  const pkg = (await device.shell(`dumpsys package ${PKG}`)).toString();
  expect(pkg).toContain(`versionName=${VERSION}`);
  const [major, minor, patch] = VERSION.split('.').map(Number);
  expect(pkg).toContain(`versionCode=${major * 1_000_000 + minor * 1000 + patch} `);
});
