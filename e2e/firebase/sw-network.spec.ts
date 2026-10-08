import { expect, test } from '@playwright/test';
import { startWithDefaults } from '../helpers';

// Firestore and Auth traffic must always reach Firebase: a cached answer would show stale data or a stale sign-in.
// Here they go to the emulators (127.0.0.1:8080 and :9099); live, to *.googleapis.com.
test.use({ serviceWorkers: 'allow' });

const FIREBASE = /127\.0\.0\.1:(8080|9099)|firestore\.googleapis\.com|identitytoolkit|securetoken/;

test('the service worker never answers or caches Firestore and Auth requests (APP-08)', async ({ page }) => {
  const fromWorker: string[] = [];
  page.on('response', r => { if (FIREBASE.test(r.url()) && r.fromServiceWorker()) fromWorker.push(r.url()); });

  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now the service worker controls the page
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });

  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', `sw${Date.now()}@test.local`);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  await startWithDefaults(page, { timeout: 15_000 });
  await page.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(page.locator('.toast span').first()).toHaveText('Reading done for today');
  await page.reload();
  await expect(page.locator('.cat').nth(1).locator('.cat-meta')).toHaveText('Done, 30 logged', { timeout: 15_000 });

  expect(fromWorker).toEqual([]);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0); // the app shell is cached, so this looked in the right place
  expect(cached.filter(u => FIREBASE.test(u))).toEqual([]);
});
