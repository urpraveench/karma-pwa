import { expect, test } from '@playwright/test';

// When the sign-in code can't load, Firebase Hosting answers the missing file with the app's index.html, as it
// does for a copy of the app left open from before a deploy. The login screen must say so in plain words.
const SIGN_IN_CODE = /\/assets\/firebaseClient-.*\.js$/;
const asHostingDoes = (route: import('@playwright/test').Route) =>
  route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>TikTym</title>' });

test('TikTym that can\'t start says so in plain words, and Reload loads it (AUTH-22)', async ({ page }) => {
  await page.route(SIGN_IN_CODE, asHostingDoes);
  await page.goto('/');
  const box = page.locator('.start-err');
  await expect(box).toContainText('TikTym couldn\'t finish loading. Check your connection, then tap Reload.', { timeout: 15_000 });
  await expect(page.locator('.login')).not.toContainText('.env.local');
  await expect(page.locator('.gbtn')).toHaveCount(0); // signing in can't work yet, so Reload is the only button
  await expect(page.locator('#em')).toHaveCount(0);

  await page.unroute(SIGN_IN_CODE);
  await box.getByRole('button', { name: 'Reload' }).click();
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await expect(page.locator('.start-err')).toHaveCount(0);
  await expect(page.locator('.gbtn')).toBeVisible();
});

test('a copy from before an update reloads itself once into the new version (APP-33)', async ({ page }) => {
  let missing = 1; // the first request finds the old file gone; after the reload, the new version's file is there
  await page.route(SIGN_IN_CODE, route => (missing-- > 0 ? asHostingDoes(route) : route.continue()));
  let loads = 0;
  page.on('load', () => { loads++; });
  await page.goto('/');
  await expect(page.locator('.gbtn')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.start-err')).toHaveCount(0);
  expect(loads).toBe(2);
});

test('a reload that fails too shows the message instead of reloading again (APP-33)', async ({ page }) => {
  await page.route(SIGN_IN_CODE, asHostingDoes);
  let loads = 0;
  page.on('load', () => { loads++; });
  await page.goto('/');
  await expect(page.locator('.start-err')).toContainText('TikTym couldn\'t finish loading', { timeout: 15_000 });
  await page.waitForTimeout(1000);
  expect(loads).toBe(2); // one automatic reload, then it stops
});
