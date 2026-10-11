import { expect, test, signIn, toast } from './helpers';

test.describe('Today', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('starts with the four default practices and a 108-bead mala', async ({ page }) => {
    await expect(page.locator('.cat .cat-name')).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation']);
    await expect(page.locator('.mala circle.bd')).toHaveCount(108);
    await expect(page.locator('.mala-center .big')).toHaveText('100'); // 30 + 30 + 30 + 10
  });

  test('a new user sees the "Start small" moment, which can be hidden for the day', async ({ page }) => {
    await expect(page.locator('.moment .m-title')).toHaveText('Start small, Demo.');
    await page.click('.m-x');
    await expect(page.locator('.moment')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.moment')).toHaveCount(0);
  });

  test('quick log clears a practice, and undo puts it back', async ({ page }) => {
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await expect(toast(page)).toHaveText('Exercise done for today');
    await expect(page.locator('.mala-center .big')).toHaveText('70');
    await expect(page.locator('.cat').nth(0).locator('.cat-meta')).toHaveText('Done, 30 logged');
    await page.click('.tundo');
    await expect(toast(page)).toHaveText('Undone');
    await expect(page.locator('.mala-center .big')).toHaveText('100');
  });

  test('clearing everything shows the celebration', async ({ page }) => {
    for (let i = 0; i < 4; i++) await page.locator('.cat .qbtn:not(.done)').first().click();
    await expect(page.locator('.celebrate .clear-word')).toHaveText('All clear');
    await page.locator('.celebrate').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.mala-center .clear-word')).toHaveText('All clear');
  });

  test('the log sheet logs a tile to the first practice with time left', async ({ page }) => {
    await page.click('.tab-log');
    await expect(page.locator('.sheet')).toBeVisible();
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await page.locator('.tile', { hasText: /^10$/ }).click();
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(toast(page)).toHaveText('+10 Exercise');
  });

  test('backfilling yesterday says so', async ({ page }) => {
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await page.locator('.seg button', { hasText: 'Yesterday' }).click();
    await page.locator('.tile', { hasText: /^5$/ }).click();
    await expect(toast(page)).toHaveText('+5 Exercise, yesterday');
  });

  test('a custom amount with a note', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.cat-open').click();
    await page.click('.tile-ghost');
    await page.locator('.link', { hasText: 'Add a note' }).click();
    await page.fill('input[placeholder="What did you do?"]', 'Chapter 3');
    await page.fill('.stepper input', '7');
    await page.click('.custom button[type=submit]');
    await expect(toast(page)).toHaveText('+7 Reading');
  });

  test('Escape closes the sheet', async ({ page }) => {
    await page.click('.tab-log');
    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0);
  });

  test('one tap says how a session felt, saved with the entry (LOG-31)', async ({ page }) => {
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await expect(toast(page)).toHaveText('Exercise done for today');
    await page.getByRole('button', { name: 'Felt good' }).click();
    await expect(toast(page)).toHaveText('Noted');
    const feels = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tiktym:data:'))
      .flatMap(k => JSON.parse(localStorage.getItem(k)!).logs.map((l: { feel?: number }) => l.feel)));
    expect(feels).toEqual([3]);
  });
});
