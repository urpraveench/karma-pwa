import { expect, test } from '@playwright/test';
import { loadSampleData, signIn, tab } from './helpers';

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
