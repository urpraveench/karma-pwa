import type { Page } from '@playwright/test';
import { DEMO, expect, loadSampleData, open, seedData, signInWith, startWithDefaults, tab, test } from './helpers';
import { lowContrast } from './contrast';

// Every screen and sheet is checked for text that's hard to read (WCAG AA contrast), in dark and in light.
const noLowContrast = async (page: Page, where: string, root = 'body') =>
  expect(await lowContrast(page, root), `low-contrast text on ${where}`).toEqual([]);

for (const scheme of ['dark', 'light'] as const) {
  const id = scheme === 'dark' ? 'APP-14' : 'APP-25';
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test(`every screen and sheet is readable (${id})`, async ({ page }) => {
      await open(page);
      await noLowContrast(page, 'sign-in');
      await page.fill('#em', DEMO.email); await page.fill('#pw', DEMO.password); await page.click('button[type=submit]');
      await expect(page.locator('.first-run')).toBeVisible();
      await page.getByRole('button', { name: '5 more minutes of Reading' }).click(); // a ticked row shows − and +
      await noLowContrast(page, 'choosing practices');
      await startWithDefaults(page);
      await loadSampleData(page);
      await page.waitForTimeout(1600); // the mala's opening animation
      for (const t of ['Today', 'Insights', 'History', 'Setup']) {
        await tab(page, t).click();
        await noLowContrast(page, t);
      }
      const sheet = async (name: string, openIt: () => Promise<unknown>) => {
        await openIt();
        await expect(page.locator('.sheet')).toBeVisible();
        await page.waitForTimeout(350); // slide-in
        await noLowContrast(page, name, '.sheet');
        await page.keyboard.press('Escape');
        await expect(page.locator('.sheet')).toHaveCount(0);
      };
      await sheet('the practice sheet', () => page.locator('.li-open').first().click());
      await tab(page, 'History').click();
      await sheet('the edit entry sheet', () => page.locator('.log-open').first().click());
      await tab(page, 'Insights').click();
      await sheet('the share sheet', () => page.locator('.share-btn').click());
      await sheet('the streak sheet', () => page.locator('.panel-link').click());
      await tab(page, 'Today').click();
      await sheet('the voice log sheet', () => page.locator('.tab-log').click());
      await page.locator('.cat').nth(1).locator('.tbtn').click();
      await expect(page.locator('.focus')).toBeVisible();
      await page.waitForTimeout(350);
      await noLowContrast(page, 'the focus timer', '.focus');
    });

    test.describe('the morning splash', () => {
      test.use({ ideaSplash: true });
      test(`today's idea splash is readable (${id}, TODAY-21)`, async ({ page }) => {
        await signInWith(page, seedData([{ id: 'r', name: 'Reading', start: '2026-10-01' }]));
        await expect(page.locator('.splash')).toBeVisible();
        await page.waitForTimeout(400);
        await noLowContrast(page, 'the morning splash', '.splash');
      });
    });

    test(`the time-of-day bar is readable in every slot (${id})`, async ({ page }) => {
      const data = seedData([{ id: 'r', name: 'Reading' }], [['r', '2026-10-06', 30], ['r', '2026-10-06', 30], ['r', '2026-10-05', 30], ['r', '2026-10-05', 30]]);
      [8, 14, 19, 23].forEach((h, i) => { data.logs[i].createdAt = new Date(2026, 9, 5 + (i < 2 ? 1 : 0), h).getTime(); });
      await signInWith(page, data);
      await tab(page, 'Insights').click();
      await expect(page.locator('.tod i')).toHaveText(['25%', '25%', '25%', '25%']);
      await noLowContrast(page, 'the time-of-day bar', '.tod');
    });
  });
}
