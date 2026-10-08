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

test.describe('Editing an entry', () => {
  const cats = [{ id: 'r', name: 'Reading' }, { id: 'w', name: 'Writing', minutes: 20 }];
  const sheet = (page: import('@playwright/test').Page) => page.locator('.sheet');

  test('tap an entry to change its practice, day, minutes and note, then undo (HIST-07)', async ({ page }) => {
    await signInWith(page, seedData(cats, [['r', '2026-10-07', 10]]));
    await tab(page, 'History').click();
    await page.locator('.log-open').click();
    await expect(sheet(page).locator('h2')).toHaveText('Edit entry');
    await expect(sheet(page).locator('.chip[aria-pressed="true"]')).toHaveText('Reading');
    await expect(page.locator('#ed')).toHaveValue('2026-10-07');
    await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('10');

    await sheet(page).locator('.chip', { hasText: 'Writing' }).click();
    await page.fill('#ed', '2026-10-09'); // the future isn't allowed
    await expect(page.locator('#ed')).toHaveValue('2026-10-07');
    await page.fill('#ed', '2026-10-05');
    await page.getByLabel('Minutes', { exact: true }).fill('24');
    await page.getByLabel('1 more').click();
    await page.fill('#en', 'First draft');
    await page.click('button:has-text("Save changes")');

    await expect(toast(page)).toHaveText('Entry updated');
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.locator('.day-h span')).toHaveText([/5 Oct/]);
    await expect(page.locator('.log .n')).toContainText('Writing');
    await expect(page.locator('.log .note')).toHaveText('First draft');
    await expect(page.locator('.log b')).toHaveText('25');

    await page.click('.tundo');
    await expect(page.locator('.day-h span')).toHaveText(['Today']);
    await expect(page.locator('.log .n')).toHaveText('Reading');
    await expect(page.locator('.log b')).toHaveText('10');
  });

  test('the change is saved (HIST-07)', async ({ page }) => {
    await signInWith(page, seedData(cats, [['r', '2026-10-07', 10]]));
    await tab(page, 'History').click();
    await page.locator('.log-open').click();
    await page.getByLabel('Minutes', { exact: true }).fill('30');
    await page.click('button:has-text("Save changes")');
    await page.reload();
    await tab(page, 'History').click();
    await expect(page.locator('.log b')).toHaveText('30');
    await expect(page.locator('.day-h small')).toHaveText(['30 points']);
  });

  test('minutes must be 1 to 1440 (HIST-07)', async ({ page }) => {
    await signInWith(page, seedData(cats, [['r', '2026-10-07', 10]]));
    await tab(page, 'History').click();
    await page.locator('.log-open').click();
    await page.getByLabel('Minutes', { exact: true }).fill('0');
    await page.click('button:has-text("Save changes")');
    await expect(toast(page)).toHaveText('Enter between 1 and 1440 minutes');
    await expect(sheet(page)).toBeVisible();
  });

  test('delete from the edit sheet, then undo (HIST-08)', async ({ page }) => {
    await signInWith(page, seedData(cats, [['r', '2026-10-07', 10]]));
    await tab(page, 'History').click();
    await page.locator('.log-open').click();
    await page.click('button:has-text("Delete entry")');
    await expect(toast(page)).toHaveText('Entry deleted');
    await expect(page.locator('.log')).toHaveCount(0);
    await page.click('.tundo');
    await expect(page.locator('.log')).toHaveCount(1);
  });

  test('an entry for an archived practice keeps its practice on offer (HIST-09)', async ({ page }) => {
    await signInWith(page, seedData([
      { id: 'r', name: 'Reading' },
      { id: 'g', name: 'Guitar', archivedFrom: '2026-10-06' },
      { id: 'c', name: 'Chess', archivedFrom: '2026-10-06' },
    ], [['g', '2026-10-05', 15]]));
    await tab(page, 'History').click();
    await page.locator('.log-open').click();
    await expect(sheet(page).locator('.chip')).toHaveText(['Reading', 'Guitar']);
    await expect(sheet(page).locator('.chip[aria-pressed="true"]')).toHaveText('Guitar');
    await page.getByLabel('Minutes', { exact: true }).fill('20');
    await page.click('button:has-text("Save changes")');
    await expect(page.locator('.log .n')).toHaveText('Guitar');
    await expect(page.locator('.log b')).toHaveText('20');
  });
});
