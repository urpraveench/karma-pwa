import { expect, test, type AndroidDevice } from '@playwright/test';
import { connect, launch, newAccount, PKG, signIn } from './helpers';

// Voice logging in the Android app (AND-09): the WebView asks Android for the microphone when the page does. `pm`
// stands in for the person's answer on Android's dialog; the emulator's microphone is real (the computer's, or silence).

let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.beforeEach(async () => {
  await device.shell(`pm clear ${PKG}`);
  await device.shell(`pm grant ${PKG} android.permission.POST_NOTIFICATIONS`); // no notification dialog over the app
});
test.afterAll(async () => { await device?.close(); });

test('allowed: tapping the microphone starts recording (AND-09)', async () => {
  await device.shell(`pm grant ${PKG} android.permission.RECORD_AUDIO`);
  const page = await launch(device);
  await signIn(page, await newAccount());
  await page.click('.tab-log');
  await expect(page.locator('.voice-recorder .voice-time')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.voice-problem')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel recording' }).click();
});

test('refused for good: says to turn the microphone on in Android\'s settings, and typing still works (AND-09)', async () => {
  await device.shell(`pm revoke ${PKG} android.permission.RECORD_AUDIO`);
  await device.shell(`pm set-permission-flags ${PKG} android.permission.RECORD_AUDIO user-fixed`); // "Don't allow" twice
  try {
    const page = await launch(device);
    await signIn(page, await newAccount());
    await page.click('.tab-log');
    await expect(page.locator('.voice-problem')).toContainText('Turn it on in Android Settings › Apps › TikTym › Permissions', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Type instead' }).click();
    await expect(page.locator('.voice-input')).toBeVisible();
  } finally {
    await device.shell(`pm clear-permission-flags ${PKG} android.permission.RECORD_AUDIO user-fixed`);
  }
});
