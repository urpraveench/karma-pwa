import { expect, test } from '@playwright/test';

test('the start screen stays up while the Firebase SDK downloads, so the page is never blank (FIRST-03)', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  await page.route(/\/assets\/(index\.esm|firebase).*\.js$/, async route => { await gate; await route.continue(); });
  await page.goto('/');
  await expect(page.locator('#boot')).toBeVisible();
  await expect(page.locator('#boot .boot-msg')).toHaveText('Loading TikTym…');
  await expect(page.locator('#root')).toBeEmpty(); // the app has started, but has nothing of its own to show yet
  release();
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await expect(page.locator('#boot')).toHaveCount(0);
});
