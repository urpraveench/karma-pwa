import { expect, test, seedData, signIn, signInWith, toast } from './helpers';

test.describe('Log sheet', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('shows minutes left on each practice chip (LOG-13)', async ({ page }) => {
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Log minutes');
    await expect(page.locator('.pick .chip')).toHaveText(['Exercise30', 'Reading30', 'Course study30', 'Meditation10']);
  });

  test('day buttons, and Earlier opens a date picker capped at today (LOG-14, LOG-15)', async ({ page }) => {
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await expect(page.locator('.seg-full button')).toHaveText(['Today', 'Yesterday', 'Mon', 'Earlier']);
    await page.locator('.seg-full button', { hasText: 'Earlier' }).click();
    const picker = page.locator('#ld');
    await expect(picker).toHaveValue('2026-10-04');
    await expect(picker).toHaveAttribute('max', '2026-10-07');
    await picker.fill('2026-10-01');
    await page.locator('.tile', { hasText: /^5$/ }).click();
    await expect(toast(page)).toHaveText('+5 Exercise, Thu 1 Oct');
  });

  test('"All that\'s left" logs the remainder (LOG-16)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.cat-open').click();
    await expect(page.locator('.tile-all b')).toHaveText('30');
    await page.click('.tile-all');
    await expect(toast(page)).toHaveText('Reading done for today');
  });

  test('a cleared practice says extra minutes still count; ✓ opens the sheet (LOG-02, LOG-17)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.qbtn').click();
    await page.locator('.cat').nth(1).locator('.qbtn.done').click();
    await expect(page.locator('.sheet-sub')).toHaveText('Reading is clear today. Extra minutes still go into your history.');
    await expect(page.locator('.tile-all')).toHaveCount(0);
  });

  test('"Start a timer instead" only for today (LOG-22, TIMER-17)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.cat-open').click();
    await page.locator('.seg-full button', { hasText: 'Yesterday' }).click();
    await expect(page.locator('.link', { hasText: 'Start a timer instead' })).toHaveCount(0);
    await page.locator('.seg-full button', { hasText: 'Today' }).click();
    await page.locator('.link', { hasText: 'Start a timer instead' }).click();
    await expect(page.locator('.focus .f-name')).toHaveText('Reading');
    // the same practice again just reopens the running timer
    await page.click('.f-min');
    await page.locator('.cat').nth(1).locator('.cat-open').click();
    await page.locator('.link', { hasText: 'Start a timer instead' }).click();
    await expect(page.locator('.focus .f-name')).toHaveText('Reading');
  });

  test('Other: default and stepper (LOG-20)', async ({ page }) => {
    await page.locator('.cat').nth(3).locator('.cat-open').click(); // Meditation, 10 left
    await page.click('.tile-ghost');
    const input = page.locator('.stepper input');
    await expect(input).toHaveValue('10');
    await page.click('.stepper button[aria-label="1 more"]');
    await expect(input).toHaveValue('11');
    for (let i = 0; i < 12; i++) await page.click('.stepper button[aria-label="1 fewer"]');
    await expect(input).toHaveValue('1');
  });

  test('manual entry keeps focus while typing several digits (LOG-20)', async ({ page }) => {
    await page.locator('.cat').nth(3).locator('.cat-open').click();
    await page.click('.tile-ghost');
    const input = page.locator('.stepper input');
    await input.click();
    await page.keyboard.press('ControlOrMeta+A');
    await input.pressSequentially('123');
    await expect(input).toHaveValue('123');
    await expect(input).toBeFocused();
  });

  test('invalid amounts are refused (LOG-24)', async ({ page }) => {
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await page.click('.tile-ghost');
    await page.fill('.stepper input', '');
    await page.click('.custom button[type=submit]');
    await expect(toast(page)).toHaveText('Enter the minutes');
    await expect(page.locator('.sheet')).toBeVisible(); // stays open to fix the amount
    await page.fill('.stepper input', '2000');
    await page.click('.custom button[type=submit]');
    await expect(toast(page)).toHaveText('Enter between 1 and 1440 minutes');
  });

  test('tapping outside closes it (LOG-23)', async ({ page }) => {
    await page.click('.tab-log');
    await page.locator('.scrim').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.sheet')).toHaveCount(0);
  });
});

test('+ with no active practices explains what to do (LOG-12, TODAY-15)', async ({ page }) => {
  await signInWith(page, seedData([]));
  await expect(page.locator('.empty')).toHaveText('No practices yet. Add one in Setup.');
  await page.click('.tab-log');
  await expect(toast(page)).toHaveText('Add a practice in Setup first');
  await expect(page.locator('.sheet')).toHaveCount(0);
});
