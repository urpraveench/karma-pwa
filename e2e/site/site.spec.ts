import { expect, test } from '../helpers';

// The marketing website (site/, tiktym.com), on a phone and on a desktop.
const APP = 'https://tiktym.web.app/';

test.describe('website (GTM-04)', () => {
  test('pitch, sections and calls to action', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle("TikTym: make time for what you're learning");
    await expect(page.locator('h1')).toHaveText("Make time for what you're learning.");
    for (const id of ['how', 'features', 'professionals', 'install', 'privacy', 'faq'])
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    await expect(page.locator('.feature h3')).toHaveText(['Your day at a glance', 'A focus timer that logs for you', 'A backlog that forgives', 'Insights that coach you']);
    const appLinks = page.locator('[data-app-link]');
    expect(await appLinks.count()).toBeGreaterThanOrEqual(5);
    for (const href of await appLinks.evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href))) expect(href).toBe(APP);
  });

  test('every clip and poster loads, and on-screen clips play', async ({ page, request }) => {
    await page.goto('/');
    const sources = await page.locator('video[data-clip]').evaluateAll(vs => vs.map(v => [(v as HTMLVideoElement).getAttribute('src')!, (v as HTMLVideoElement).poster]));
    expect(sources.length).toBe(5);
    for (const [src, poster] of sources) {
      expect((await request.get(src)).status(), src).toBe(200);
      expect((await request.get(poster)).status(), poster).toBe(200);
    }
    // clips only play while on screen; on a phone the hero clip sits below the headline
    const hero = page.locator('.hero video');
    await hero.scrollIntoViewIfNeeded();
    await expect.poll(() => hero.evaluate(v => !(v as HTMLVideoElement).paused)).toBe(true);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect.poll(() => hero.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true); // and pause off screen
  });

  test('with reduced motion, nothing autoplays and a play button shows', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(800);
    expect(await page.locator('.hero video').evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
    await expect(page.locator('.hero .play')).toBeVisible();
  });

  test('fits the screen with no sideways scrolling', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test('FAQ answers open, and legal links point at the app pages', async ({ page }) => {
    await page.goto('/');
    await page.locator('summary', { hasText: 'What happens if I miss a day?' }).click();
    await expect(page.locator('details[open] p')).toContainText('choose None for no limit');
    await expect(page.locator('footer a', { hasText: 'Terms' })).toHaveAttribute('href', `${APP}terms/`);
    await expect(page.locator('footer a', { hasText: 'Privacy' })).toHaveAttribute('href', `${APP}privacy/`);
  });

  test('serves the email header image (AUTH-29)', async ({ request }) => {
    const r = await request.get('/email/header.png');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
  });

  test('link preview tags', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://tiktym.com/og.png');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('working professionals');
  });
});
