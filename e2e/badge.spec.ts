import type { Page } from '@playwright/test';
import { expect, seedData, signInWith, tab, test } from './helpers';

// The app badge (NOTIF-13): the number on TikTym's icon is the practices left today. The browser's badge calls are
// recorded instead of reaching the operating system.
async function recordBadge(page: Page, supported = true) {
  await page.addInitScript(supported => {
    const nav = Navigator.prototype as unknown as Record<string, unknown>;
    if (!supported) { delete nav.setAppBadge; delete nav.clearAppBadge; return; }
    const w = window as unknown as { __badge: (number | null)[] };
    w.__badge = [];
    nav.setAppBadge = async (n: number) => { w.__badge.push(n); };
    nav.clearAppBadge = async () => { w.__badge.push(null); };
  }, supported);
}
const lastBadge = (page: Page) => page.evaluate(() => (window as unknown as { __badge: (number | null)[] }).__badge.at(-1));
const row = (page: Page) => page.locator('.li', { hasText: 'Show count on app icon' });
const DATA = seedData([{ id: 'ex', name: 'Exercise' }, { id: 'rd', name: 'Reading' }, { id: 'md', name: 'Meditation', minutes: 10 }], [['md', '2026-10-07', 5]]);

test('practices left today on the icon, partly logged ones included; cleared when the day is clear (NOTIF-13)', async ({ page }) => {
  await recordBadge(page);
  await signInWith(page, DATA);
  await expect.poll(() => lastBadge(page)).toBe(3); // Meditation, 5 of 10, still counts
  await page.getByRole('button', { name: 'Log 30 minutes of Exercise' }).click();
  await expect.poll(() => lastBadge(page)).toBe(2);
  await page.getByRole('button', { name: 'Log 30 minutes of Reading' }).click();
  await page.getByRole('button', { name: 'Log 5 minutes of Meditation' }).click();
  await expect.poll(() => lastBadge(page)).toBeNull();
});

test('"Show count on app icon" is on to start, and off clears the icon (NOTIF-13)', async ({ page }) => {
  await recordBadge(page);
  await signInWith(page, DATA);
  await tab(page, 'Setup').click();
  await expect(row(page)).toHaveAttribute('aria-pressed', 'true');
  await row(page).click();
  await expect(row(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lastBadge(page)).toBeNull();
  await page.reload();
  await expect(page.locator('.hello')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { __badge: (number | null)[] }).__badge.filter(n => n !== null))).toEqual([]);
});

test('no switch where the device has no app badges, such as Android (NOTIF-13)', async ({ page }) => {
  await recordBadge(page, false);
  await signInWith(page, DATA);
  await tab(page, 'Setup').click();
  await expect(page.locator('.li', { hasText: 'Daily reminder' })).toBeVisible();
  await expect(row(page)).toHaveCount(0);
});
