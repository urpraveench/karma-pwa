import type { Page } from '@playwright/test';
import { expect, signIn, tab, test } from './helpers';

const row = (page: Page, name: string) => page.locator('.li', { hasText: name });
const savedSettings = (page: Page) => page.evaluate(() => {
  const key = Object.keys(localStorage).find(k => k.startsWith('tiktym:data:'))!;
  return JSON.parse(localStorage.getItem(key)!).settings;
});

test('Setup › Notifications and privacy: every email on to start, each off with one tap, and saved (NOTIF-01)', async ({ page }) => {
  await signIn(page);
  await tab(page, 'Setup').click();
  await expect(page.locator('.sect-h h2', { hasText: 'Notifications and privacy' })).toBeVisible();
  for (const name of ['Tips and reminders', 'Weekly recap', 'News about TikTym'])
    await expect(row(page, name)).toHaveAttribute('aria-pressed', 'true');
  await row(page, 'Weekly recap').click();
  await expect(row(page, 'Weekly recap')).toHaveAttribute('aria-pressed', 'false');
  expect((await savedSettings(page)).emails).toEqual({ recap: false });
  await page.reload();
  await tab(page, 'Setup').click();
  await expect(row(page, 'Weekly recap')).toHaveAttribute('aria-pressed', 'false');
  await expect(row(page, 'News about TikTym')).toHaveAttribute('aria-pressed', 'true');
});
