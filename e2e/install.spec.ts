import type { Page } from '@playwright/test';
import { lowContrast } from './contrast';
import { expect, signIn, tab, test, toast } from './helpers';

test.use({ installCard: true });

const card = (page: Page) => page.locator('.install-card');
const logFirstMinutes = (page: Page) => page.locator('.cat').nth(0).locator('.qbtn').click();
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0';

/** What Chrome sends when it's ready to offer installing; the user's answer is given in advance. */
const offerInstall = (page: Page, outcome: 'accepted' | 'dismissed') => page.evaluate(o => {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
  e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: o });
  dispatchEvent(e);
}, outcome);

test('shows on Today only after the first minutes are logged (APP-30)', async ({ page }) => {
  await signIn(page);
  await expect(card(page)).toHaveCount(0);
  await logFirstMinutes(page);
  await expect(card(page).locator('h2')).toHaveText('Get TikTym on your home screen');
});

test('Android with the browser\'s offer: one Install button, then the card goes (APP-27)', async ({ page }) => {
  await signIn(page);
  await logFirstMinutes(page);
  await offerInstall(page, 'accepted');
  await card(page).getByRole('button', { name: 'Install TikTym' }).click();
  await expect(toast(page)).toHaveText('TikTym is on your home screen');
  await expect(card(page)).toHaveCount(0);
});

test('Android without the offer: where to find Install in Chrome (APP-27)', async ({ page }) => {
  await signIn(page);
  await logFirstMinutes(page);
  await expect(card(page).locator('.install-steps li')).toHaveText([/In Chrome, tap ⋮ at the top right/, /Add to home screen or Install app/]);
});

test.describe('iPhone', () => {
  test.use({ userAgent: IPHONE });
  test('Share, then Add to Home Screen, with the real icons (APP-28)', async ({ page }) => {
    await signIn(page);
    await logFirstMinutes(page);
    const steps = card(page).locator('.install-steps li');
    await expect(steps).toHaveText([/Tap Share .*at the bottom of Safari \(on newer iPhones, tap ⋯ first\)/, /Choose Add to Home Screen .*, then Add/]);
    await expect(steps.locator('.glyph svg')).toHaveCount(2);
    await expect(card(page)).toContainText("No Share button at the bottom? You're inside another app");
  });
});

test.describe('Chrome on iPhone', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1' });
  test('Share is in the address bar, then Add to Home Screen (APP-28)', async ({ page }) => {
    await signIn(page);
    await logFirstMinutes(page);
    await expect(card(page).locator('.install-steps li')).toHaveText([/Tap Share .*in the address bar at the top right/, /Scroll down, tap Add to Home Screen .*, then Add/]);
  });
});

test.describe("inside another app's browser", () => {
  test.use({ userAgent: INSTAGRAM, permissions: ['clipboard-read', 'clipboard-write'] });
  test('says to open it in the browser first, and copies the link (APP-29)', async ({ page }) => {
    await signIn(page);
    await logFirstMinutes(page);
    await expect(card(page)).toContainText("You're in another app's browser");
    await expect(card(page).locator('.install-steps li').first()).toContainText('Open in browser');
    await card(page).getByRole('button', { name: 'Copy the link' }).click();
    await expect(toast(page)).toHaveText('Link copied. Paste it into Safari or Chrome.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://app.tiktym.com');
  });
});

test('Not now hides it, and it stays hidden after a reload (APP-30)', async ({ page }) => {
  await signIn(page);
  await logFirstMinutes(page);
  await card(page).getByRole('button', { name: 'Not now' }).first().click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.hello')).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('tiktym:install-nudge')))!)).toEqual({ dismissals: 1, until: '2026-10-10' });
});

test.describe('already installed', () => {
  test('no card, and no Setup row (APP-30, APP-31)', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    await signIn(page);
    await logFirstMinutes(page);
    await expect(card(page)).toHaveCount(0);
    await tab(page, 'Setup').click();
    await expect(page.locator('.li', { hasText: 'Add TikTym to your home screen' })).toHaveCount(0);
  });
});

test('Setup › Add TikTym to your home screen opens the guide at any time (APP-31)', async ({ page }) => {
  await signIn(page);
  await tab(page, 'Setup').click();
  await page.locator('.li', { hasText: 'Add TikTym to your home screen' }).click();
  await expect(page.locator('.sheet h2')).toHaveText('Add TikTym to your home screen');
  await expect(page.locator('.sheet .install-steps li')).toHaveCount(2);
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme, userAgent: IPHONE });
    test(`the install card is readable (${scheme === 'dark' ? 'APP-14' : 'APP-25'})`, async ({ page }) => {
      await signIn(page);
      await logFirstMinutes(page);
      await expect(card(page)).toBeVisible();
      expect(await lowContrast(page, '.install-card')).toEqual([]);
    });
  });
}
