import { readFileSync } from 'node:fs';
import { DEMO, expect, open, test, signIn, tab } from './helpers';

test('tab bar highlights the current tab and scrolls to the top (APP-01)', async ({ page }) => {
  await signIn(page);
  await expect(tab(page, 'Today')).toHaveAttribute('aria-current', 'page');
  await page.mouse.wheel(0, 2000);
  await tab(page, 'Setup').click();
  await expect(tab(page, 'Setup')).toHaveAttribute('aria-current', 'page');
  await expect(tab(page, 'Today')).not.toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('system theme follows the phone (SET-03)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await signIn(page);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 27, 25)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 240, 234)');
});

test('reduced motion turns animations off (APP-15)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await expect(page.locator('.mala circle.bd').first()).toHaveCSS('animation-name', 'none');
});

test('buttons that only show an icon or number have labels (APP-16)', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('.cat').nth(1).locator('.qbtn')).toHaveAttribute('aria-label', 'Log 30 minutes of Reading');
  await expect(page.locator('.cat').nth(1).locator('.tbtn')).toHaveAttribute('aria-label', 'Start a Reading timer');
  await expect(page.locator('.tab-log')).toHaveAttribute('aria-label', 'Log minutes');
  await page.click('.tab-log');
  await expect(page.locator('.sheet')).toHaveAttribute('role', 'dialog');
});

test('returning to the app refreshes the date straight away (APP-10)', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('.date')).toHaveText('Wednesday 7 October');
  await page.clock.setSystemTime(new Date(2026, 9, 8, 9, 0)); // time passes while the app is in the background
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.date')).toHaveText('Thursday 8 October');
});

test('a failed save on this device is reported (SYNC-02)', async ({ page }) => {
  await signIn(page);
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) { if (k.startsWith('tiktym:data:')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); };
  });
  await page.locator('.cat').nth(0).locator('.qbtn').click();
  await expect(page.locator('.toast span')).toHaveText('Could not save on this device');
});

test('the version shows on the login page and in Setup › About (APP-21)', async ({ page }) => {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  await open(page);
  await expect(page.locator('.login .build')).toHaveText(new RegExp(`^TikTym ${version.replace(/\./g, '\\.')} · [0-9a-f]{7,}(-dirty)? · \\d+ \\w{3} \\d{4}$`));
  await page.fill('#em', DEMO.email);
  await page.fill('#pw', DEMO.password);
  await page.click('button[type=submit]');
  await tab(page, 'Setup').click();
  await expect(page.locator('.li.about .t')).toContainText(`TikTym ${version}`);
  await expect(page.locator('.li.about small')).toContainText(/^Build [0-9a-f]{7,}/);
});

test.describe('update bar (APP-22)', () => {
  const NEWER = { version: '9.9.9', commit: 'abcdef0', builtAt: '2026-10-09T10:00:00Z' };

  test('no bar when this is the live version', async ({ page }) => {
    const checked = page.waitForResponse('**/version.json');
    await signIn(page);
    await checked;
    await expect(page.locator('.update-bar')).toHaveCount(0);
  });

  test('a newer live version shows the bar on login and every tab; Reload loads it', async ({ page }) => {
    await page.route('**/version.json', r => r.fulfill({ json: NEWER }));
    await open(page);
    await expect(page.locator('.update-bar')).toContainText('New version ready (9.9.9)');
    await page.fill('#em', DEMO.email);
    await page.fill('#pw', DEMO.password);
    await page.click('button[type=submit]');
    for (const t of ['Today', 'Insights', 'History', 'Setup']) {
      await tab(page, t).click();
      await expect(page.locator('.update-bar')).toBeVisible();
    }
    await page.mouse.wheel(0, 1500);
    await expect(page.locator('.update-bar')).toBeInViewport(); // pinned while scrolling
    await page.unroute('**/version.json'); // after reloading, the app is the live version
    const checkedAfterReload = page.waitForResponse('**/version.json');
    await Promise.all([page.waitForEvent('load'), page.locator('.update-bar button').click()]);
    await expect(page.locator('.hello')).toBeVisible();
    await checkedAfterReload;
    await expect(page.locator('.update-bar')).toHaveCount(0);
  });

  test('a rebuild with the same version number still counts as new', async ({ page }) => {
    const own = await (await page.request.get('/version.json')).json();
    await page.route('**/version.json', r => r.fulfill({ json: { ...own, commit: 'fedcba9' } }));
    await open(page);
    await expect(page.locator('.update-bar')).toContainText(`New version ready (${own.version} · fedcba9)`);
  });

  test('no bar when the version file is missing', async ({ page, consoleErrors }) => {
    await page.route('**/version.json', r => r.fulfill({ status: 404, body: '' }));
    const checked = page.waitForResponse('**/version.json');
    await open(page);
    await checked;
    await expect(page.locator('.update-bar')).toHaveCount(0);
    // Chrome itself logs the 404; that's the scenario, not an app error
    const i = consoleErrors.findIndex(e => e.includes('status of 404'));
    if (i >= 0) consoleErrors.splice(i, 1);
  });
});
