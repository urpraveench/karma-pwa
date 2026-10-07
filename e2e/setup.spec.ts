import { expect, test, type Page } from '@playwright/test';
import { loadSampleData, signIn, tab, toast } from './helpers';

async function addJournaling(page: Page) {
  await page.locator('.chip', { hasText: 'Add practice' }).click();
  await page.fill('#cn', 'Journaling');
  await page.locator('.preset .chip', { hasText: /^15$/ }).click();
  await page.click('.sheet button[type=submit]');
  await expect(toast(page)).toHaveText('Added Journaling');
}

test.describe('Setup', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await tab(page, 'Setup').click();
  });

  test('an empty name blocks saving', async ({ page }) => {
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    await page.click('.sheet button[type=submit]');
    await expect(page.locator('.sheet')).toBeVisible();
    await expect(page.locator('#cn:invalid')).toHaveCount(1);
  });

  test('add a practice', async ({ page }) => {
    await addJournaling(page);
    await expect(page.locator('.li', { hasText: 'Journaling' })).toContainText('15 min every day');
    await tab(page, 'Today').click();
    await expect(page.locator('.cat .cat-name')).toContainText(['Journaling']);
  });

  test('edit days', async ({ page }) => {
    await addJournaling(page);
    await page.locator('.li', { hasText: 'Journaling' }).click();
    await expect(page.locator('.sheet h2')).toHaveText('Edit practice');
    await page.locator('.days button[aria-label=Saturday]').click();
    await page.locator('.days button[aria-label=Sunday]').click();
    await page.click('.sheet button[type=submit]');
    await expect(toast(page)).toHaveText('Saved changes');
    await expect(page.locator('.li', { hasText: 'Journaling' })).toContainText('15 min Mon, Tue, Wed, Thu, Fri');
  });

  test('archive and restore', async ({ page }) => {
    await addJournaling(page);
    await page.locator('.li', { hasText: 'Journaling' }).click();
    await page.locator('.sheet .btn-2', { hasText: 'Archive' }).click();
    await expect(toast(page)).toHaveText('Archived Journaling. Its backlog is cleared.');
    await expect(page.locator('.li', { hasText: 'Journaling' }).locator('.badge')).toHaveText('Archived');
    await page.locator('.li', { hasText: 'Journaling' }).click();
    await page.locator('.sheet .btn-2', { hasText: 'Restore' }).click();
    await expect(toast(page)).toHaveText('Restored Journaling');
  });

  test('delete a practice', async ({ page }) => {
    await addJournaling(page);
    await page.locator('.li', { hasText: 'Journaling' }).click();
    await page.locator('.sheet .btn-danger').click();
    await expect(toast(page)).toHaveText('Deleted Journaling');
    await expect(page.locator('.li', { hasText: 'Journaling' })).toHaveCount(0);
  });

  test('backlog limit', async ({ page }) => {
    await page.locator('.seg button', { hasText: 'None' }).click();
    await expect(toast(page)).toHaveText('Backlog has no limit');
    await page.locator('.seg button', { hasText: '3 days' }).click();
    await expect(toast(page)).toHaveText('Backlog capped at 3 days per practice');
    await expect(page.locator('.seg button', { hasText: '3 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('theme switch persists', async ({ page }) => {
    await page.locator('.seg button', { hasText: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('start over resets to the defaults', async ({ page }) => {
    await loadSampleData(page);
    await page.locator('.li', { hasText: 'Start over' }).click();
    await expect(toast(page)).toHaveText('Started over');
    await tab(page, 'History').click();
    await expect(page.locator('.empty')).toBeVisible();
  });

  test('export downloads a backup that import accepts', async ({ page }) => {
    await loadSampleData(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.li', { hasText: 'Export as JSON' }).click()]);
    expect(download.suggestedFilename()).toBe('tiktym-backup-2026-10-07.json');
    const path = await download.path();
    await page.locator('.li', { hasText: 'Start over' }).click();
    await page.setInputFiles('input[type=file]', path);
    await expect(toast(page)).toHaveText('Backup imported');
    await tab(page, 'History').click();
    expect(await page.locator('.log').count()).toBeGreaterThan(50);
  });

  test('importing a file that is not a backup is refused', async ({ page }) => {
    await page.setInputFiles('input[type=file]', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
    await expect(toast(page)).toHaveText("That file isn't a TikTym backup");
  });
});
