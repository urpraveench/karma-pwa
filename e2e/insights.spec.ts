import { expect, test, loadSampleData, signIn, tab } from './helpers';

test.describe('Insights', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('empty state before anything is logged', async ({ page }) => {
    await tab(page, 'Insights').click();
    await expect(page.locator('.empty')).toContainText('Log a couple of days');
  });

  test('coaching, consistency, health, milestones and rhythm with sample data', async ({ page }) => {
    await loadSampleData(page);
    await tab(page, 'Insights').click();
    await expect(page.locator('.date')).toHaveText('Since Wed 29 Jul');
    const coach = page.locator('.coach li');
    expect(await coach.count()).toBeGreaterThanOrEqual(1);
    expect(await coach.count()).toBeLessThanOrEqual(3);
    expect(await page.locator('.heat rect').count()).toBeGreaterThan(50);
    await expect(page.locator('.ph .ph-name')).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation']);
    await expect(page.locator('.ms-top b').first()).toContainText('-day streak');
    await expect(page.locator('.panel', { hasText: 'Your rhythm' }).locator('.sub').first()).toHaveText('Strongest on Mondays, weakest on Saturdays.');
  });

  test('daily detail range switch', async ({ page }) => {
    await loadSampleData(page);
    await tab(page, 'Insights').click();
    const bars = page.locator('.panel', { hasText: 'Daily points' }).locator('svg > g');
    await expect(bars).toHaveCount(7);
    await page.locator('.seg button', { hasText: '30 days' }).click();
    await expect(bars).toHaveCount(30);
  });
});

test.describe('Insights details', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await loadSampleData(page);
    await tab(page, 'Insights').click();
  });

  test('90-day range, backlog chart, and when you log (INS-36, INS-37, INS-38)', async ({ page }) => {
    await page.locator('.seg button', { hasText: '90 days' }).click();
    // sample data starts 70 days ago, so 90 days shows all 71
    await expect(page.locator('.panel', { hasText: 'Daily points' }).locator('svg > g')).toHaveCount(71);
    await expect(page.locator('.panel', { hasText: 'Points still owed' }).locator('polyline')).toHaveCount(1);
    await expect(page.locator('.tod i')).not.toHaveCount(0);
    await expect(page.locator('.tod-key span')).toHaveText(['Morning', 'Afternoon', 'Evening', 'Night']);
  });

  test('the chosen range survives switching tabs (INS-39)', async ({ page }) => {
    await page.locator('.seg button', { hasText: '30 days' }).click();
    await tab(page, 'Today').click();
    await tab(page, 'Insights').click();
    await expect(page.locator('.seg button[aria-pressed=true]')).toHaveText('30 days');
  });

  test('this week compares with last week (INS-30)', async ({ page }) => {
    await expect(page.locator('.wk > div')).toHaveCount(3);
    await expect(page.locator('.wk .delta').first()).toContainText(/vs last week|same as last week/);
  });

  test('records (INS-34)', async ({ page }) => {
    await expect(page.locator('.recs span')).toHaveText([/^practised since Wed 29 Jul$/, 'longest streak', /^best day, /, 'days ended clear']);
  });
});
