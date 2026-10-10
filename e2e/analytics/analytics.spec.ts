import type { Page } from '@playwright/test';
import { DEMO, expect, open, seedData, signIn, signInWith, tab, test, toast } from '../helpers';
import { startWithDefaults } from '../helpers';

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

const statsRow = (page: Page) => page.locator('.li', { hasText: 'Usage statistics' });

test('on by default once signed in; the sign-in screen itself sends nothing (ANA-01)', async ({ page }) => {
  const requests = await stubGoogle(page);
  await open(page);
  expect(requests).toHaveLength(0);
  expect(await pushed(page)).toHaveLength(0);
  await page.fill('#em', DEMO.email); await page.fill('#pw', DEMO.password); await page.click('button[type=submit]');
  await startWithDefaults(page);
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  await tab(page, 'Setup').click();
  await expect(statsRow(page)).toHaveAttribute('aria-pressed', 'true');
});

test('a device that said no stays off (ANA-01)', async ({ page }) => {
  const requests = await stubGoogle(page);
  await open(page);
  await page.evaluate(() => localStorage.setItem('tiktym:analytics', 'denied'));
  await page.fill('#em', DEMO.email); await page.fill('#pw', DEMO.password); await page.click('button[type=submit]');
  await startWithDefaults(page);
  await page.locator('.cat').nth(0).locator('.qbtn').click();
  await tab(page, 'Setup').click();
  await expect(statsRow(page)).toHaveAttribute('aria-pressed', 'false');
  expect(requests).toHaveLength(0);
  expect(await pushed(page)).toHaveLength(0);
});

test('an account from before is on straight away; the notice only informs (ANA-01, NOTIF-02)', async ({ page }) => {
  const requests = await stubGoogle(page);
  await signInWith(page, seedData([{ id: 'r', name: 'Reading' }], [], { notice: undefined }));
  await expect(page.locator('.notice')).toBeVisible();
  await expect.poll(() => requests.length).toBeGreaterThan(0); // without waiting for OK
});

test.describe('What it sends (ANA-02)', () => {
  test.beforeEach(async ({ page }) => {
    await stubGoogle(page);
    await signIn(page);
  });

  test('loads Google Analytics with advertising features off', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => (window as unknown as { __gtagLoaded?: boolean }).__gtagLoaded)).toBe(true);
    const config = (await pushed(page)).find(a => a[0] === 'config')!;
    expect(config[1]).toBe('G-TEST12345');
    expect(config[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    expect((config[2] as { linker: { domains: string[] } }).linker.domains).toEqual(['tiktym.com', 'www.tiktym.com', 'app.tiktym.com']);
  });

  test('a page view per tab', async ({ page }) => {
    await tab(page, 'Insights').click();
    await tab(page, 'Setup').click();
    const titles = (await events(page, 'page_view')).map(e => (e[2] as { page_title: string }).page_title);
    expect(titles).toEqual(['today', 'insights', 'setup']); // from the moment the account is ready
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

test('Setup › Notifications and privacy turns statistics off, stops events and removes the cookies (ANA-03)', async ({ page, context }) => {
  await stubGoogle(page);
  await signIn(page);
  await context.addCookies([{ name: '_ga', value: 'GA1.1.123.456', url: 'http://localhost:4179' }]);
  await tab(page, 'Setup').click();
  const row = statsRow(page);
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'false');
  expect((await context.cookies()).some(c => c.name === '_ga')).toBe(false);
  const before = (await events(page)).length;
  await tab(page, 'Today').click();
  await page.locator('.cat').nth(0).locator('.qbtn').click();
  expect((await events(page)).length).toBe(before);
  await page.reload();
  await startWithDefaults(page);
  await tab(page, 'Setup').click();
  await expect(statsRow(page)).toHaveAttribute('aria-pressed', 'false'); // remembered
});
