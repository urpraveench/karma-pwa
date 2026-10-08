import type { Page } from '@playwright/test';
import { startWithDefaults, expect, NOW, test } from './helpers';
import { lowContrast } from './contrast';

// A slow connection: the app's code is held back until release() is called.
function holdAppCode(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  void page.route('**/assets/index-*.js', async route => { await gate; await route.continue(); });
  return () => release();
}
const boot = (page: Page) => page.locator('#boot');
const message = (page: Page) => boot(page).locator('.boot-msg');

test('the start screen shows at once, before any app code arrives, and makes way for sign-in (FIRST-03)', async ({ page }) => {
  await page.clock.install({ time: NOW });
  const release = holdAppCode(page);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(boot(page)).toBeVisible();
  await expect(boot(page).locator('b')).toHaveText('TikTym');
  await expect(message(page)).toHaveText('Loading TikTym…');
  await expect(boot(page).getByRole('button', { name: 'Reload' })).toBeHidden();
  release();
  await expect(page.locator('.login h1')).toHaveText('TikTym');
  await expect(boot(page)).toHaveCount(0);
});

test('after 5 seconds it says the connection is slow, after 20 it offers Reload (FIRST-05, FIRST-06)', async ({ page }) => {
  await page.clock.install({ time: NOW });
  const release = holdAppCode(page);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(message(page)).toHaveText('Loading TikTym…');
  await page.clock.fastForward(5_000);
  await expect(message(page)).toHaveText('Your connection seems slow. TikTym is still loading, and it opens instantly next time.');
  await expect(boot(page).getByRole('button', { name: 'Reload' })).toBeHidden();
  await page.clock.fastForward(15_000);
  await expect(message(page)).toHaveText('Still loading? Check your connection, then try again.');
  await boot(page).getByRole('button', { name: 'Reload' }).click();
  release(); // this time the code arrives: the app opens
  await expect(page.locator('.login h1')).toHaveText('TikTym');
});

test('offline, it says so, and loads by itself when the connection returns (FIRST-07)', async ({ page, context }) => {
  await page.clock.install({ time: NOW });
  const release = holdAppCode(page);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(message(page)).toHaveText('Loading TikTym…');
  await context.setOffline(true);
  await expect(message(page)).toHaveText('You’re offline. TikTym needs a connection the first time it opens; after that it works offline.');
  await expect(boot(page).getByRole('button', { name: 'Reload' })).toBeVisible();
  release();
  await context.setOffline(false);
  await expect(page.locator('.login h1')).toHaveText('TikTym');
  await expect(boot(page)).toHaveCount(0);
});

test('a returning user goes from the start screen straight to Today (FIRST-03)', async ({ page }) => {
  await page.clock.install({ time: NOW });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('tiktym:session', JSON.stringify({ id: 'local-demo@tiktym.local', email: 'demo@tiktym.local', name: 'Test user' })));
  const release = holdAppCode(page);
  await page.reload({ waitUntil: 'commit' });
  await expect(boot(page)).toBeVisible();
  release();
  await startWithDefaults(page);
  await expect(boot(page)).toHaveCount(0);
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });
    test(`the start screen is readable at every stage (FIRST-03, ${scheme === 'dark' ? 'APP-14' : 'APP-25'})`, async ({ page, context }) => {
      await page.clock.install({ time: NOW });
      holdAppCode(page);
      await page.goto('/', { waitUntil: 'commit' });
      await expect(message(page)).toHaveText('Loading TikTym…');
      expect(await lowContrast(page, '#boot')).toEqual([]);
      await page.clock.fastForward(20_000);
      await expect(boot(page).getByRole('button', { name: 'Reload' })).toBeVisible();
      expect(await lowContrast(page, '#boot')).toEqual([]);
      await context.setOffline(true);
      await expect(boot(page)).toHaveAttribute('data-stage', 'offline');
      expect(await lowContrast(page, '#boot')).toEqual([]);
      await context.setOffline(false);
    });
  });
}

test("Google's font stylesheet never holds up the first paint (APP-26)", async ({ page }) => {
  void page.route('https://fonts.googleapis.com/**', () => new Promise(() => {})); // never arrives
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('#boot')).toBeVisible();
  await expect(page.locator('.login h1')).toHaveText('TikTym'); // and the app opens, in the system font
  expect(await page.locator('link[href^="https://fonts.googleapis.com"][rel="stylesheet"]').count()).toBe(0);
});
