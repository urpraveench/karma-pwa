import { expect, test } from '@playwright/test';
import { signIn, toast } from './helpers';

test.describe('Focus timer', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.locator('.cat').nth(1).locator('.tbtn').click(); // Reading, 30 min target
    await expect(page.locator('.focus .f-name')).toHaveText('Reading');
  });

  test('counts towards the target and alerts when it is reached', async ({ page }) => {
    await expect(page.locator('.f-sub')).toHaveText('30 min to target');
    await page.clock.fastForward('31:00');
    await expect(page.locator('.f-sub')).toHaveText('Target reached, 1 min extra');
    await expect(toast(page)).toContainText('target reached');
    await expect(page).toHaveTitle(/^31:0\d Reading$/);
    await expect(page.locator('.f-stop')).toHaveText('Stop and log 31 min');
  });

  test('changing the target', async ({ page }) => {
    await page.locator('.f-goal .chip', { hasText: /^15$/ }).click();
    await expect(page.locator('.f-sub')).toHaveText('15 min to target');
  });

  test('minimises to the mini-player and shows live minutes on the practice', async ({ page }) => {
    await page.clock.fastForward('12:00');
    await page.click('.f-min');
    await expect(page.locator('.mini')).toBeVisible();
    await expect(page.locator('.tbtn.live')).toHaveText('12′');
    await page.click('.mini-open');
    await expect(page.locator('.focus')).toBeVisible();
  });

  test('pause and resume from the mini-player', async ({ page }) => {
    await page.click('.f-min');
    await page.click('.mini-btn[aria-label=Pause]');
    await expect(page.locator('.mini.paused')).toBeVisible();
    await page.click('.mini-btn[aria-label=Resume]');
    await expect(page.locator('.mini.paused')).toHaveCount(0);
  });

  test('stop logs the whole minutes and resets the tab title', async ({ page }) => {
    await page.clock.fastForward('31:00');
    await page.click('.f-stop');
    await expect(page.locator('.focus')).toHaveCount(0);
    await expect(toast(page)).toHaveText('Reading done for today');
    await expect(page).toHaveTitle('TikTym');
  });

  test('stopping under a minute logs nothing', async ({ page }) => {
    await page.click('.f-stop');
    await expect(toast(page)).toHaveText('Under a minute, so nothing was logged');
  });

  test('discard throws the time away', async ({ page }) => {
    await page.clock.fastForward('05:00');
    await page.locator('.btn-2', { hasText: 'Discard' }).click();
    await expect(toast(page)).toHaveText('Timer discarded');
    await expect(page.locator('.mini')).toHaveCount(0);
  });

  test('the timer survives a reload', async ({ page }) => {
    await page.clock.fastForward('03:00');
    await page.reload();
    await expect(page.locator('.mini')).toBeVisible();
  });
});
