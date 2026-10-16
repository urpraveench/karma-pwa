import { expect, test, type Page } from '@playwright/test';
import { startWithDefaults } from '../helpers';

// A second copy of the app (another tab, or the Android app reopened while the last copy's claim on the storage hasn't
// lapsed) shares Firestore's offline storage instead of running without it (SYNC-18).

const toast = (page: Page) => page.locator('.toast span').first();
const MEMORY = 'Falling back to memory cache';

test('a second tab keeps Firestore\'s offline storage, and both tabs show the same data (SYNC-18)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', `tabs${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  await startWithDefaults(page, { timeout: 15_000 });

  const tab2 = await context.newPage();
  const said: string[] = [];
  tab2.on('console', m => said.push(m.text()));
  await tab2.goto('/'); // signed in already: the same browser
  await expect(tab2.locator('.hello')).toBeVisible({ timeout: 15_000 });
  await tab2.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(toast(tab2)).toHaveText('Reading done for today');
  expect(said.filter(s => s.includes(MEMORY))).toEqual([]);

  await page.reload(); // the first tab reads the second tab's entry
  await expect(page.locator('.cat').nth(1).locator('.cat-meta')).toHaveText('Done, 30 logged', { timeout: 15_000 });
});
