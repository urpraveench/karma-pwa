import { expect, test } from '@playwright/test';
import { DEMO } from './helpers';

test.use({ serviceWorkers: 'allow' });

test.describe('Installable PWA', () => {
  test('serves a manifest with name, icons and standalone display', async ({ page }) => {
    await page.goto('/');
    const m = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
    expect(m).toMatchObject({ name: 'TikTym', short_name: 'TikTym', display: 'standalone' });
    expect(m.icons).toHaveLength(3);
  });

  test('opens offline once the service worker is installed', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.fill('#em', DEMO.email);
    await page.fill('#pw', DEMO.password);
    await page.click('button[type=submit]');
    await expect(page.locator('.hello')).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible();
    await page.goto('/any/deep/link');
    await expect(page.locator('.hello')).toBeVisible();
  });
});
