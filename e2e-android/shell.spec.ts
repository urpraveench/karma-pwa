import { expect, test, type AndroidDevice } from '@playwright/test';
import { connect, launch, newAccount } from './helpers';

// The Android shell (AND-01, AND-02): the same app, opened from the files bundled in the install.

let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.afterAll(async () => {
  await device?.shell('cmd connectivity airplane-mode disable');
  await device?.close();
});

test('opens on the sign-in screen from its own files, with no service worker and no web App Check (AND-01)', async () => {
  const page = await launch(device);
  await expect(page.locator('.login h1')).toHaveText('TikTym');
  expect(new URL(page.url()).hostname).toBe('localhost'); // served from the install, not the website
  expect(await page.evaluate(async () => (await navigator.serviceWorker?.getRegistrations())?.length ?? 0)).toBe(0);
  await expect(page.getByText('protected by reCAPTCHA')).toHaveCount(0);
});

test('opens with no connection at all (AND-01)', async () => {
  await device.shell('cmd connectivity airplane-mode enable');
  try {
    const page = await launch(device);
    await expect(page.locator('.login h1')).toHaveText('TikTym');
  } finally {
    await device.shell('cmd connectivity airplane-mode disable');
  }
});

test('email sign-in opens the account, and it stays signed in when reopened (AND-02)', async () => {
  const { email, password } = await newAccount();
  let page = await launch(device);
  await page.fill('#em', email);
  await page.fill('#pw', password);
  await page.click('button[type=submit]');
  await expect(page.locator('.hello, .first-run')).toBeVisible({ timeout: 30_000 });
  if (await page.locator('.first-run').count()) await page.locator('.fr-start .btn').click();
  await expect(page.locator('.hello')).toBeVisible({ timeout: 30_000 });

  page = await launch(device); // closed and opened again
  await expect(page.locator('.hello')).toBeVisible({ timeout: 30_000 });
});
