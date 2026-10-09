import { expect, test } from '../helpers';

// The marketing website (site/, tiktym.com), on a phone and on a desktop.
const APP = 'https://app.tiktym.com/';

test.describe('website (GTM-04)', () => {
  test('pitch, sections and calls to action, which open app.tiktym.com (GTM-06)', async ({ page }) => {
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

  test('FAQ answers open, and legal links point at the app pages on app.tiktym.com (GTM-06), plus LinkedIn (GTM-10)', async ({ page }) => {
    await page.goto('/');
    await page.locator('summary', { hasText: 'What happens if I miss a day?' }).click();
    await expect(page.locator('details[open] p')).toContainText('choose None for no limit');
    await expect(page.locator('footer a', { hasText: 'Terms' })).toHaveAttribute('href', `${APP}terms/`);
    await expect(page.locator('footer a', { hasText: 'Privacy' })).toHaveAttribute('href', `${APP}privacy/`);
    await expect(page.locator('footer a', { hasText: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/company/tiktym/');
  });

  test('serves the email header image (AUTH-29)', async ({ request }) => {
    const r = await request.get('/email/header.png');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
  });

  test('the privacy promise matches consent-based analytics (LEGAL-05)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.promise')).toContainText('anonymous usage stats only if you say yes');
    await expect(page.locator('body')).not.toContainText('no analytics');
  });

  test('link preview tags', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://tiktym.com/og.png');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('working professionals');
  });
});

test.describe('website analytics (ANA-04)', () => {
  const GTAG = 'https://www.googletagmanager.com/gtag/js**';
  const pushed = (page: import('@playwright/test').Page) => page.evaluate(() =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer || []).map(a => Array.from(a)));

  test('asks first, and loads nothing before an answer', async ({ page }) => {
    const requests: string[] = [];
    await page.route(GTAG, r => { requests.push(r.request().url()); return r.fulfill({ contentType: 'text/javascript', body: '' }); });
    await page.goto('/');
    await expect(page.locator('.consent-bar')).toBeVisible();
    await page.locator('#features').scrollIntoViewIfNeeded();
    expect(requests).toHaveLength(0);
  });

  test('"No thanks" is remembered and nothing loads', async ({ page }) => {
    const requests: string[] = [];
    await page.route(GTAG, r => { requests.push(r.request().url()); return r.fulfill({ contentType: 'text/javascript', body: '' }); });
    await page.goto('/');
    await page.locator('.consent-bar [data-deny]').click();
    await expect(page.locator('.consent-bar')).toBeHidden();
    await page.reload();
    await expect(page.locator('.consent-bar')).toBeHidden();
    expect(requests).toHaveLength(0);
  });

  test('Allow loads Analytics (ads off, app domain linked) and counts clicks into the app', async ({ page }) => {
    await page.route(GTAG, r => r.fulfill({ contentType: 'text/javascript', body: 'window.__gtagLoaded = true;' }));
    await page.goto('/');
    await page.locator('.consent-bar [data-allow]').click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __gtagLoaded?: boolean }).__gtagLoaded)).toBe(true);
    const config = (await pushed(page)).find(a => a[0] === 'config')!;
    expect(config[1]).toBe('G-JL1YCFLK23');
    expect(config[2]).toMatchObject({ allow_google_signals: false, allow_ad_personalization_signals: false });
    expect((config[2] as { linker: { domains: string[] } }).linker.domains).toContain('app.tiktym.com');
    // keep the page here: the click still reaches the counting code, only the navigation is cancelled
    await page.evaluate(() => addEventListener('click', e => e.preventDefault(), true));
    await page.locator('.hero [data-app-link="hero"]').click();
    await expect.poll(async () => (await pushed(page)).some(a => a[0] === 'event' && a[1] === 'open_app' && (a[2] as { link_location: string }).link_location === 'hero')).toBe(true);
  });
});

test.describe("What's new (GTM-11, GTM-12)", () => {
  test('lists coming changes, then releases newest first, with pictures for headline features', async ({ page }) => {
    await page.goto('/updates/');
    await expect(page).toHaveTitle("What's new in TikTym");
    await expect(page.locator('h1')).toHaveText("What's new in TikTym");
    // "Coming in the next update" appears only while something is waiting to ship, and then always first
    const kinds = await page.locator('.u-release').evaluateAll(els => els.map(e => e.classList.contains('u-next') ? 'next' : 'release'));
    expect(kinds.indexOf('next')).toBeLessThanOrEqual(0);
    expect(kinds.filter(k => k === 'next').length).toBeLessThanOrEqual(1);
    if (kinds[0] === 'next') await expect(page.locator('.u-next h2')).toHaveText('Coming in the next update');
    const versions = await page.locator('.u-release[id]').evaluateAll(els => els.map(e => e.id.slice(1)));
    const sorted = [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    expect(versions).toEqual(sorted);
    for (const img of await page.locator('.u-shot img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    }
  });

  test('the home page footer links to it', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer a', { hasText: "What's new" }).click();
    await expect(page.locator('h1')).toHaveText("What's new in TikTym");
  });
});
