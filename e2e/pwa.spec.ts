import { expect, test } from '@playwright/test';
import { DEMO, startWithDefaults } from './helpers';

test.use({ serviceWorkers: 'allow' });

test.describe('Installable PWA', () => {
  test('serves a manifest with name, icons and standalone display', async ({ page }) => {
    await page.goto('/');
    const m = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
    expect(m).toMatchObject({ name: 'TikTym', short_name: 'TikTym', display: 'standalone' });
    expect(m.icons).toHaveLength(3);
  });

  test('opens offline once the service worker is installed', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.fill('#em', DEMO.email);
    await page.fill('#pw', DEMO.password);
    await page.click('button[type=submit]');
    await startWithDefaults(page);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible();
    await page.goto('/any/deep/link');
    await expect(page.locator('.hello')).toBeVisible();
  });
});

test("Firebase's reserved addresses always come from the network (APP-20)", async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // the Google sign-in relay page: must reach Firebase Hosting, not be answered with the app shell
  const handler = await page.goto('/__/auth/handler?apiKey=x');
  expect(handler?.fromServiceWorker()).toBe(false);
  // ordinary app addresses are still served by the service worker
  const deepLink = await page.goto('/any/deep/link');
  expect(deepLink?.fromServiceWorker()).toBe(true);
});

test('version.json is published and always comes from the network (APP-23)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const [response] = await Promise.all([
    page.waitForResponse('**/version.json'),
    page.evaluate(() => fetch('/version.json')),
  ]);
  expect(response.fromServiceWorker()).toBe(false);
  const v = await response.json();
  expect(v.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(v.commit).toBeTruthy();
});

test('the Terms and Privacy pages open offline (LEGAL-04)', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto('/terms/');
  await expect(page.locator('h1')).toHaveText('Terms of Service');
  await page.goto('/privacy/');
  await expect(page.locator('h1')).toHaveText('Privacy Policy');
});
