import { expect, test, type Page } from '@playwright/test';
import { startWithDefaults } from '../helpers';

// Closing or reloading the app straight after logging must not lose the entry (SYNC-16). Firestore saves writes to
// its offline queue a moment later, so the app keeps its own note of unsaved changes until Firestore confirms them.

const toast = (page: Page) => page.locator('.toast span').first();
const reading = (page: Page) => page.locator('.cat').nth(1).locator('.cat-meta');

async function signUp(page: Page, email: string) {
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', email);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  await startWithDefaults(page, { timeout: 15_000 });
}

test('an entry logged just before a reload is kept, here and on other devices (SYNC-16)', async ({ page, browser }) => {
  const email = `quick${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`;
  await signUp(page, email);
  await page.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(toast(page)).toHaveText('Reading done for today');
  await page.reload(); // at once, before Firestore has queued the write
  await startWithDefaults(page, { timeout: 15_000 });
  await expect(reading(page)).toHaveText('Done, 30 logged', { timeout: 15_000 });

  const phone2 = await (await browser.newContext({ ...test.info().project.use })).newPage();
  await phone2.goto('/');
  await expect(phone2.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await phone2.fill('#em', email);
  await phone2.fill('#pw', 'secret123');
  await phone2.click('button[type=submit]');
  await startWithDefaults(phone2, { timeout: 15_000 });
  await expect(reading(phone2)).toHaveText('Done, 30 logged', { timeout: 15_000 });
});

test('an edit or a delete just before a reload is kept too (SYNC-16)', async ({ page }) => {
  await signUp(page, `quick${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`);
  await page.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(toast(page)).toHaveText('Reading done for today');
  await page.locator('.tab', { hasText: 'History' }).click();

  await page.locator('.log-open').click();
  await page.getByLabel('Minutes', { exact: true }).fill('20');
  await page.click('button:has-text("Save changes")');
  await expect(toast(page)).toHaveText('Entry updated');
  await page.reload();
  await startWithDefaults(page, { timeout: 15_000 });
  await page.locator('.tab', { hasText: 'History' }).click();
  await expect(page.locator('.log b')).toHaveText('20', { timeout: 15_000 });

  await page.locator('.log .x').click();
  await expect(toast(page)).toHaveText('Entry deleted');
  await page.reload();
  await startWithDefaults(page, { timeout: 15_000 });
  await page.locator('.tab', { hasText: 'History' }).click();
  await expect(page.locator('.empty')).toContainText('Nothing logged yet', { timeout: 15_000 });
});
