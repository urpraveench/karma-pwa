import { expect, test } from '@playwright/test';
import { signIn, tab, toast } from './helpers';

test.describe('History', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('empty state', async ({ page }) => {
    await tab(page, 'History').click();
    await expect(page.locator('.empty')).toContainText('Nothing logged yet');
  });

  test('lists entries with notes, newest first', async ({ page }) => {
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await page.locator('.cat').nth(1).locator('.cat-open').click();
    await page.locator('.link', { hasText: 'Add a note' }).click();
    await page.fill('input[placeholder="What did you do?"]', 'Chapter 3');
    await page.locator('.tile', { hasText: /^5$/ }).click();
    await tab(page, 'History').click();
    await expect(page.locator('.day-h span')).toHaveText(['Today']);
    await expect(page.locator('.day-h small')).toHaveText(['35 points']);
    await expect(page.locator('.log .n')).toHaveCount(2);
    await expect(page.locator('.log .note')).toHaveText('Chapter 3');
  });

  test('delete an entry, then undo', async ({ page }) => {
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await tab(page, 'History').click();
    await page.locator('.log .x').click();
    await expect(toast(page)).toHaveText('Entry deleted');
    await expect(page.locator('.log')).toHaveCount(0);
    await page.click('.tundo');
    await expect(page.locator('.log')).toHaveCount(1);
  });
});
