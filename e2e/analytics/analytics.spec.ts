import type { Page } from '@playwright/test';
import { expect, signIn, tab, test, toast } from '../helpers';

// A build with a test GA4 ID. Google's script is replaced by a stub, so nothing reaches real Analytics; the test
// reads what the app pushed to the dataLayer, which is exactly what gtag would send.
const GTAG = 'https://www.googletagmanager.com/gtag/js**';

async function stubGoogle(page: Page) {
  const requests: string[] = [];
  await page.route(GTAG, r => { requests.push(r.request().url()); return r.fulfill({ contentType: 'text/javascript', body: 'window.__gtagLoaded = true;' }); });
  return requests;
}
const pushed = (page: Page) => page.evaluate(() =>
  ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer || []).map(a => Array.from(a)));
const events = async (page: Page, name?: string) => (await pushed(page)).filter(a => a[0] === 'event' && (!name || a[1] === name));

async function allowInSetup(page: Page) {
  await tab(page, 'Setup').click();
  await page.locator('.li', { hasText: 'Share anonymous usage stats' }).click();
  await tab(page, 'Today').click();
}

test('no consent card on Today, and nothing loads without consent (ANA-01)', async ({ page }) => {
  const requests = await stubGoogle(page);
  await signIn(page);
  await expect(page.locator('.consent')).toHaveCount(0);
  await page.locator('.cat').nth(0).locator('.qbtn').click();
  await tab(page, 'Insights').click();
  await tab(page, 'Setup').click();
  await expect(page.locator('.li', { hasText: 'Share anonymous usage stats' })).toHaveAttribute('aria-pressed', 'false');
  expect(requests).toHaveLength(0);
  expect(await pushed(page)).toHaveLength(0);
});

test.describe('What switching it on sends (ANA-02)', () => {
  test.beforeEach(async ({ page }) => {
    await stubGoogle(page);
    await signIn(page);
    await allowInSetup(page);
  });

  test('loads Google Analytics with advertising features off', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => (window as unknown as { __gtagLoaded?: boolean }).__gtagLoaded)).toBe(true);
    const config = (await pushed(page)).find(a => a[0] === 'config')!;
    expect(config[1]).toBe('G-TEST12345');
    expect(config[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    expect((config[2] as { linker: { domains: string[] } }).linker.domains).toEqual(['tiktym.com', 'www.tiktym.com', 'tiktym.web.app']);
  });

  test('a page view per tab', async ({ page }) => {
    await tab(page, 'Insights').click();
    await tab(page, 'Setup').click();
    const titles = (await events(page, 'page_view')).map(e => (e[2] as { page_title: string }).page_title);
    expect(titles).toEqual(['today', 'insights', 'setup']); // from the moment it's switched on
  });

  test('logging, timers and practices are counted, with no personal details', async ({ page }) => {
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await page.locator('.cat').nth(3).locator('.tbtn').click();
    await page.clock.fastForward('10:01');
    await expect(toast(page)).toContainText('target reached');
    await page.click('.f-stop');
    await tab(page, 'Setup').click();
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    await page.fill('#cn', 'Secret project');
    await page.click('.sheet button[type=submit]');
    const all = await events(page);
    const names = all.map(e => e[1]);
    expect(names).toContain('timer_target_reached');
    expect(names).toContain('practice_added');
    expect((await events(page, 'log_entry')).map(e => (e[2] as { method: string }).method)).toEqual(['quick', 'timer']);
    const sent = JSON.stringify(all);
    for (const personal of ['demo@tiktym.local', 'Exercise', 'Meditation', 'Secret project']) expect(sent).not.toContain(personal);
  });
});

test('Setup › Privacy turns sharing off, stops events and removes the cookies (ANA-03)', async ({ page, context }) => {
  await stubGoogle(page);
  await signIn(page);
  await allowInSetup(page);
  await context.addCookies([{ name: '_ga', value: 'GA1.1.123.456', url: 'http://localhost:4179' }]);
  await tab(page, 'Setup').click();
  const row = page.locator('.li', { hasText: 'Share anonymous usage stats' });
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'false');
  expect((await context.cookies()).some(c => c.name === '_ga')).toBe(false);
  const before = (await events(page)).length;
  await tab(page, 'Today').click();
  await page.locator('.cat').nth(0).locator('.qbtn').click();
  expect((await events(page)).length).toBe(before);
  await page.reload();
  await expect(page.locator('.hello')).toBeVisible();
  await tab(page, 'Setup').click();
  await expect(page.locator('.li', { hasText: 'Share anonymous usage stats' })).toHaveAttribute('aria-pressed', 'false'); // remembered
});
