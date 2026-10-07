import { expect, test, seedData, signIn, signInWith, tab, toast } from './helpers';

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

test('lists the 60 most recent days with entries (HIST-06)', async ({ page }) => {
  await signIn(page);
  await tab(page, 'Setup').click();
  await page.locator('.li', { hasText: 'Load sample data' }).click();
  await tab(page, 'History').click();
  await expect(page.locator('.day-h')).toHaveCount(60);
});

test('an entry whose practice is gone shows as "Deleted practice" (HIST-05)', async ({ page }) => {
  await signInWith(page, seedData([{ id: 'r', name: 'Reading' }], [['gone', '2026-10-06', 15]]));
  await tab(page, 'History').click();
  await expect(page.locator('.log .n')).toHaveText('Deleted practice');
});
