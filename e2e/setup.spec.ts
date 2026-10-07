import type { Page } from '@playwright/test';
import { expect, test, loadSampleData, onDialog, seedData, signIn, signInWith, tab, toast } from './helpers';

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

test.describe('Setup details', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await tab(page, 'Setup').click();
  });

  test('header totals what is due today (PRAC-02)', async ({ page }) => {
    await expect(page.locator('.date')).toHaveText('100 points due on a day like today');
  });

  test('practice form rules: minutes range and at least one day (PRAC-05, PRAC-06)', async ({ page }) => {
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    await page.fill('#cn', 'Journaling');
    await page.fill('.stepper input', '2000');
    await page.click('.sheet button[type=submit]');
    await expect(toast(page)).toHaveText('Minutes a day must be between 1 and 1440');
    await page.fill('.stepper input', '20');
    for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) await page.locator(`.days button[aria-label=${d}]`).click();
    await page.click('.sheet button[type=submit]');
    await expect(toast(page)).toHaveText('Pick at least one day');
  });

  test('minutes stepper moves in 5s (PRAC-05)', async ({ page }) => {
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    const input = page.locator('.stepper input');
    await expect(input).toHaveValue('20');
    await page.click('.stepper button[aria-label="5 more"]');
    await expect(input).toHaveValue('25');
  });

  test('day picker starts on Monday; new practices get the next colour (PRAC-08, PRAC-17)', async ({ page }) => {
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    await expect(page.locator('.days button')).toHaveText(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    await expect(page.locator('.sw[aria-pressed=true]')).toHaveAttribute('aria-label', 'Colour #C2410C'); // 5th colour for the 5th practice
    await page.locator('.sw[aria-label="Colour #0E7490"]').click();
    await expect(page.locator('.sw[aria-pressed=true]')).toHaveAttribute('aria-label', 'Colour #0E7490');
  });

  test('starting yesterday makes yesterday count (PRAC-07)', async ({ page }) => {
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    await page.fill('#cn', 'Journaling');
    await page.locator('.preset .chip', { hasText: /^15$/ }).click();
    await page.locator('.seg-full button', { hasText: 'Yesterday' }).click();
    await page.click('.sheet button[type=submit]');
    await tab(page, 'Today').click();
    await expect(page.locator('.cat', { hasText: 'Journaling' }).locator('.cat-meta')).toHaveText('0 of 30, 15 carried');
  });

  test('editing shows the hint and lets you move the start date (PRAC-12, PRAC-18)', async ({ page }) => {
    await page.locator('.li', { hasText: 'Reading' }).click();
    await expect(page.locator('.sheet .hint')).toHaveText('New minutes or days apply from today. Past days keep their old target.');
    await expect(page.locator('.since span')).toHaveText('Since Wed 7 Oct');
    await page.locator('.since .link', { hasText: 'Change' }).click();
    await page.locator('.sheet input[type=date]').fill('2026-10-06');
    await page.click('.sheet button[type=submit]');
    await expect(page.locator('.li', { hasText: 'Reading' })).toContainText('since Tue 6 Oct');
  });

  test('closing the sheet without saving changes nothing (PRAC-19)', async ({ page }) => {
    await page.locator('.li', { hasText: 'Reading' }).click();
    await page.fill('#cn', 'Changed');
    await page.keyboard.press('Escape');
    await expect(page.locator('.li', { hasText: 'Reading' })).toBeVisible();
    await expect(page.locator('.li', { hasText: 'Changed' })).toHaveCount(0);
  });

  test('declining a confirm changes nothing (PRAC-16, SET-10)', async ({ page }) => {
    onDialog(page, 'dismiss');
    await page.locator('.li', { hasText: 'Reading' }).click();
    await page.locator('.sheet .btn-danger').click();
    await expect(page.locator('.sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.li', { hasText: 'Load sample data' }).click();
    await page.locator('.li', { hasText: 'Start over' }).click();
    await expect(page.locator('.li .t', { hasText: /^Reading/ })).toHaveCount(1);
    await expect(page.locator('.list').first().locator('.li')).toHaveCount(4);
  });

  test('account panel and test-mode note (SET-11, SET-16)', async ({ page }) => {
    await expect(page.locator('.badge.test')).toHaveText('Test mode');
    await expect(page.locator('.li', { hasText: 'Test user' })).toContainText('demo@tiktym.local');
    await expect(page.locator('.devhint')).toContainText('Test mode keeps data in this browser only.');
    await expect(page.locator('.li', { hasText: 'Delete account' })).toHaveCount(0);
  });

  test('importing the same backup twice works (SET-08)', async ({ page }) => {
    await loadSampleData(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.li', { hasText: 'Export as JSON' }).click()]);
    const path = await download.path();
    for (let i = 0; i < 2; i++) {
      await page.setInputFiles('input[type=file]', path);
      await expect(toast(page)).toHaveText('Backup imported');
    }
  });
});

test('a new practice goes last (PRAC-20)', async ({ page }) => {
  await signIn(page);
  await tab(page, 'Setup').click();
  await page.locator('.chip', { hasText: 'Add practice' }).click();
  await page.fill('#cn', 'Journaling');
  await page.click('.sheet button[type=submit]');
  await expect(page.locator('.list').first().locator('.li .t')).toHaveText([/^Exercise/, /^Reading/, /^Course study/, /^Meditation/, /^Journaling/]);
  await tab(page, 'Today').click();
  await expect(page.locator('.cat .cat-name')).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation', 'Journaling']);
});

test('archived practices stay in history charts but leave practice health (PRAC-21)', async ({ page }) => {
  await signInWith(page, seedData(
    [{ id: 'r', name: 'Reading', start: '2026-10-01' }, { id: 'x', name: 'Old', start: '2026-10-01', archivedFrom: '2026-10-05' }],
    [['r', '2026-10-06', 30], ['x', '2026-10-02', 30]],
  ));
  await tab(page, 'Insights').click();
  await expect(page.locator('.ph .ph-name')).toHaveText(['Reading']);
  await tab(page, 'History').click();
  await expect(page.locator('.log .n')).toHaveText(['Reading', 'Old']);
});
