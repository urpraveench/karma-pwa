import type { Page } from '@playwright/test';
import { expect, seedData, signIn, signInWith, tab, test } from './helpers';

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

test.describe('the one-time notice for accounts from before (NOTIF-02)', () => {
  const before = () => seedData([{ id: 'r', name: 'Reading' }], [], { notice: undefined });

  test('shows on Today; OK hides it for good', async ({ page }) => {
    await signInWith(page, before());
    const notice = page.locator('.notice');
    await expect(notice.locator('h2')).toHaveText('Emails and usage statistics');
    await expect(notice).toContainText('Setup › Notifications and privacy');
    await notice.getByRole('button', { name: 'OK' }).click();
    await expect(notice).toHaveCount(0);
    expect((await savedSettings(page)).notice).toBe('2026-10-10');
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible();
    await expect(page.locator('.notice')).toHaveCount(0);
  });

  test('Review settings opens Setup at the switches', async ({ page }) => {
    await signInWith(page, before());
    await page.locator('.notice').getByRole('button', { name: 'Review settings' }).click();
    await expect(tab(page, 'Setup')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.sect-h h2', { hasText: 'Notifications and privacy' })).toBeVisible();
  });

  test('a new account never sees it: it was told at sign-up', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.notice')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible();
    await expect(page.locator('.notice')).toHaveCount(0);
  });
});
