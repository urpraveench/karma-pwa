import { expect, test, onDialog, signIn, tab, toast } from './helpers';

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

  test('minimises to the mini-player and shows live minutes on the practice (TIMER-09, TIMER-10)', async ({ page }) => {
    await page.clock.fastForward('12:00');
    await page.click('.f-min');
    await expect(page.locator('.mini')).toBeVisible();
    await expect(page.locator('.tbtn.live')).toHaveText('12 min'); // a number over "min", not 12′ (TIMER-09)
    await expect(page.locator('.mala circle.bd.live')).toHaveCount(13); // 12 of 100 owed → 13 of 108 beads pulse (TIMER-09)
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

  test('after a timer session, one tap says how it felt, saved with the entry (LOG-31)', async ({ page }) => {
    await page.clock.fastForward('12:00');
    await page.click('.f-stop');
    await expect(toast(page)).toHaveText('+12 Reading');
    await page.getByRole('button', { name: 'Felt good' }).click();
    await expect(toast(page)).toHaveText('Noted');
    const feels = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tiktym:data:'))
      .flatMap(k => JSON.parse(localStorage.getItem(k)!).logs.map((l: { feel?: number }) => l.feel)));
    expect(feels).toEqual([3]);
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

test.describe('Focus timer edge cases', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('starting another practice stops and logs the first (TIMER-16)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.tbtn').click();
    await page.clock.fastForward('05:00');
    await page.click('.f-min');
    await page.locator('.cat').nth(0).locator('.tbtn').click();
    await expect(page.locator('.focus .f-name')).toHaveText('Exercise');
    await expect(toast(page)).toHaveText('+5 Reading');
  });

  test('declining to switch keeps the running timer (TIMER-16)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.tbtn').click();
    await page.click('.f-min');
    onDialog(page, 'dismiss');
    await page.locator('.cat').nth(0).locator('.tbtn').click();
    await expect(page.locator('.focus')).toHaveCount(0);
    await expect(page.locator('.mini small')).toHaveText('Reading');
  });

  test('stopping after 4+ hours asks first; declining opens Other instead (TIMER-14)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.tbtn').click();
    await page.clock.fastForward('04:01:00');
    onDialog(page, 'dismiss');
    await page.click('.f-stop');
    await expect(page.locator('.focus')).toHaveCount(0);
    await expect(page.locator('.sheet .custom')).toBeVisible();
    await expect(page.locator('.mini')).toHaveCount(0);
  });

  test('stopping after 4+ hours logs everything when confirmed (TIMER-14)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.tbtn').click();
    await page.clock.fastForward('04:01:00');
    await page.click('.f-stop');
    await expect(toast(page)).toHaveText('Reading done for today');
  });

  test('deleting the practice clears its timer (TIMER-19)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.tbtn').click();
    await page.click('.f-min');
    await tab(page, 'Setup').click();
    await page.locator('.li', { hasText: 'Reading' }).click();
    await page.locator('.sheet .btn-danger').click();
    await expect(page.locator('.mini')).toHaveCount(0);
    await expect(page).toHaveTitle('TikTym');
  });

  test('Escape closes the focus view; the timer keeps running (TIMER-20, APP-12)', async ({ page }) => {
    await page.locator('.cat').nth(1).locator('.tbtn').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.focus')).toHaveCount(0);
    await expect(page.locator('.mini')).toBeVisible();
  });

  test('beads fill as time passes and turn gold at the target (TIMER-03, TIMER-05)', async ({ page }) => {
    await page.locator('.cat').nth(3).locator('.tbtn').click(); // Meditation: 10 beads
    await page.clock.fastForward('05:00');
    await expect(page.locator('.f-ring svg > circle[fill="var(--c)"]')).toHaveCount(5);
    await page.clock.fastForward('05:00');
    await expect(page.locator('.f-ring svg > circle[fill="var(--gold)"]')).toHaveCount(10);
  });
});
