import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

// The real build, served as if it were on the old address; app.tiktym.com is a stand-in page.
async function serveAsOldAddress(page: Page, baseURL: string) {
  await page.route('https://tiktym.web.app/**', async route => {
    const url = new URL(route.request().url());
    await route.fulfill({ response: await route.fetch({ url: baseURL + url.pathname + url.search }) });
  });
  await page.route('https://app.tiktym.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>New address</title><p>app.tiktym.com</p>' }));
}

test('the old address in a browser tab goes to the same page on app.tiktym.com (GTM-08)', async ({ page, baseURL }) => {
  await serveAsOldAddress(page, baseURL!);
  await page.goto('https://tiktym.web.app/?ref=linkedin#top');
  await expect(page).toHaveURL('https://app.tiktym.com/?ref=linkedin#top');
  await expect(page.locator('p')).toHaveText('app.tiktym.com');
});

test('an app installed from the old address keeps working, with a "TikTym has moved" bar (GTM-09)', async ({ page, baseURL }) => {
  await serveAsOldAddress(page, baseURL!);
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true })); // as an iPhone home-screen app
  await page.goto('https://tiktym.web.app/');
  await expect(page).toHaveURL('https://tiktym.web.app/');
  await expect(page.locator('.login h1')).toHaveText('TikTym'); // the app still runs here
  const bar = page.locator('.moved-bar');
  await expect(bar).toContainText('TikTym has moved. Open app.tiktym.com and add it to your home screen.');
  const open = bar.getByRole('link', { name: 'Open' });
  await expect(open).toHaveAttribute('href', 'https://app.tiktym.com/');
  await expect(open).toHaveAttribute('target', '_blank');
});

test('no moved bar on the app\'s own address (GTM-09)', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym');
  await expect(page.locator('.moved-bar')).toHaveCount(0);
});
