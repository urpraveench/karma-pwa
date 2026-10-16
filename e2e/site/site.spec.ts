import { expect, test } from '../helpers';

// The marketing website (site/, tiktym.com), on a phone and on a desktop.
const APP = 'https://app.tiktym.com/';

// The website loads Google Analytics by default, with the real ID. Tests must never report to it: every request to
// Google's tag or collection servers is answered here with nothing. Analytics tests add their own stand-in, which
// Playwright tries first because it was added last.
const reached: string[] = [];
test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, r => { reached.push(r.request().url()); return r.fulfill({ status: 204, body: '' }); });
});

test.describe('website (GTM-04)', () => {
  test('pitch, sections and calls to action, which open app.tiktym.com (GTM-06)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('TikTym: 100 minutes a day for your productive life');
    await expect(page.locator('h1')).toHaveText('100 minutes a day for your productive life.');
    for (const id of ['how', 'features', 'professionals', 'install', 'privacy', 'faq'])
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    await expect(page.locator('.feature h3')).toHaveText(['Log by voice, with AI', 'Your day at a glance', 'A focus timer that logs for you', 'A backlog that forgives', 'Insights that coach you']);
    const appLinks = page.locator('[data-app-link]');
    expect(await appLinks.count()).toBeGreaterThanOrEqual(5);
    for (const href of await appLinks.evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href))) expect(href).toBe(APP);
  });

  test('every clip and poster loads, and on-screen clips play', async ({ page, request }) => {
    await page.goto('/');
    const sources = await page.locator('video[data-clip]').evaluateAll(vs => vs.map(v => [(v as HTMLVideoElement).getAttribute('src')!, (v as HTMLVideoElement).poster]));
    expect(sources.length).toBe(8); // the hero, 5 feature clips and 2 install videos (GTM-20)
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

  test('FAQ answers open, and legal links point at the app pages on app.tiktym.com (GTM-06), plus LinkedIn and Instagram (GTM-10)', async ({ page }) => {
    await page.goto('/');
    await page.locator('summary', { hasText: 'What happens if I miss a day?' }).click();
    await expect(page.locator('details[open] p')).toContainText('choose None for no limit');
    await expect(page.locator('footer a', { hasText: 'Terms' })).toHaveAttribute('href', `${APP}terms/`);
    await expect(page.locator('footer a', { hasText: 'Privacy' })).toHaveAttribute('href', `${APP}privacy/`);
    await expect(page.locator('footer a', { hasText: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/company/tiktym/');
    await expect(page.locator('footer a', { hasText: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/tiktym.app/');
  });

  test('serves the header image the emails use (NOTIF-03)', async ({ request }) => {
    const r = await request.get('/email/header.png');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
  });

  test('the privacy promise matches on-by-default analytics with an opt-out (LEGAL-05)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.promise')).toContainText('usage statistics you can opt out of any time');
    await expect(page.locator('body')).not.toContainText('no analytics');
  });

  test('link preview tags', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://tiktym.com/og.png');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('working professionals');
  });
});

test.describe('website analytics, on by default with an opt-out (ANA-04)', () => {
  const GTAG = 'https://www.googletagmanager.com/gtag/js**';
  const pushed = (page: import('@playwright/test').Page) => page.evaluate(() =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer || []).map(a => Array.from(a)));

  test('loads straight away, with a notice offering OK and Opt out', async ({ page }) => {
    const requests: string[] = [];
    await page.route(GTAG, r => { requests.push(r.request().url()); return r.fulfill({ contentType: 'text/javascript', body: '' }); });
    await page.goto('/');
    const bar = page.locator('.consent-bar');
    await expect(bar).toContainText('We count visits with Google Analytics');
    await expect(bar.locator('button')).toHaveText(['Opt out', 'OK']);
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    await bar.locator('[data-allow]').click();
    await expect(bar).toBeHidden();
    await page.reload();
    await expect(bar).toBeHidden(); // OK is remembered; Analytics carries on
    await expect.poll(() => requests.length).toBeGreaterThan(1);
  });

  test('Opt out stops it, removes the cookies, and is remembered', async ({ page, context }) => {
    const requests: string[] = [];
    await page.route(GTAG, r => { requests.push(r.request().url()); return r.fulfill({ contentType: 'text/javascript', body: '' }); });
    await page.goto('/');
    await context.addCookies([{ name: '_ga', value: 'GA1.1.123.456', url: page.url() }]);
    await page.locator('.consent-bar [data-deny]').click();
    await expect(page.locator('.consent-bar')).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)['ga-disable-G-JL1YCFLK23'])).toBe(true);
    expect((await context.cookies()).some(c => c.name === '_ga')).toBe(false);
    const before = requests.length;
    await page.reload();
    await expect(page.locator('.consent-bar')).toBeHidden();
    await page.locator('#features').scrollIntoViewIfNeeded();
    expect(requests.length).toBe(before); // nothing loads after opting out
  });

  test('Analytics runs with ads off and the app domain linked, and counts clicks into the app', async ({ page }) => {
    await page.route(GTAG, r => r.fulfill({ contentType: 'text/javascript', body: 'window.__gtagLoaded = true;' }));
    await page.goto('/');
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
    // its own footer links to LinkedIn and Instagram too (GTM-10)
    await expect(page.locator('footer a', { hasText: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/company/tiktym/');
    await expect(page.locator('footer a', { hasText: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/tiktym.app/');
  });
});

test('the first FAQ answers how TikTym differs from other habit apps (GTM-14)', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('#faq details').first();
  await expect(first.locator('summary')).toHaveText('How is TikTym different from other habit apps?');
  await first.locator('summary').click();
  await expect(first.locator('p')).toContainText('Every minute counts');
  await expect(first.locator('p')).toContainText('never pile up');
});

test('search engines get a robots.txt and a sitemap (GTM-15)', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://tiktym.com/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain('<loc>https://tiktym.com/</loc>');
  expect(xml).toContain('<loc>https://tiktym.com/updates/</loc>');
});

test('structured data describes TikTym, and its FAQ matches the page word for word (GTM-16)', async ({ page }) => {
  await page.goto('/');
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
  const byType = Object.fromEntries((data['@graph'] as { '@type': string }[]).map(g => [g['@type'], g as Record<string, any>]));
  expect(Object.keys(byType)).toEqual(['Organization', 'WebSite', 'WebApplication', 'FAQPage']);
  expect(byType.Organization.sameAs).toContain('https://www.linkedin.com/company/tiktym/');
  expect(byType.Organization.sameAs).toContain('https://www.instagram.com/tiktym.app/');
  expect(byType.WebApplication).toMatchObject({ url: 'https://app.tiktym.com/', offers: { price: '0', priceCurrency: 'INR' } });
  const shown = await page.locator('#faq details').evaluateAll(ds => ds.map(d => ({
    q: d.querySelector('summary')!.textContent!.trim(),
    a: d.querySelector('p')!.textContent!.replace(/\s+/g, ' ').trim(),
  })));
  const marked = (byType.FAQPage.mainEntity as { name: string; acceptedAnswer: { text: string } }[]).map(e => ({ q: e.name, a: e.acceptedAnswer.text }));
  expect(marked).toEqual(shown);
});

test('an llms.txt summary for AI tools (GTM-17)', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.ok()).toBe(true);
  const text = await res.text();
  expect(text).toMatch(/^# TikTym/);
  for (const link of ['https://tiktym.com/', 'https://app.tiktym.com/', 'https://tiktym.com/updates/', 'https://www.linkedin.com/company/tiktym/', 'https://www.instagram.com/tiktym.app/']) expect(text).toContain(link);
  expect(text).toContain('Log by voice with AI'); // GTM-21
  expect(text).toContain('not AI'); // the coaching is rules, and says so
});

test('the AI is voice logging, said plainly: hero, how it works, a feature, privacy and the FAQ (GTM-21)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('100 minutes a day for your productive life.'); // the brand line stays first
  await expect(page.locator('.hero .lead')).toContainText("Just say what you did, and TikTym's AI logs it for you.");
  await expect(page.locator('.hero .facts li')).toContainText(['Log by voice with AI', 'Stored in India']);
  await expect(page.locator('.hero .facts')).not.toContainText('stays in India'); // voice may be processed outside India
  await expect(page.locator('#how .steps h3').nth(1)).toHaveText('Say it, time it, or tap it');
  const voice = page.locator('.feature').first();
  await expect(voice.locator('h3')).toHaveText('Log by voice, with AI');
  await expect(voice.locator('video')).toHaveAttribute('src', '/clips/voice.mp4');
  await expect(voice).toContainText('nothing saves without you');
  await expect(page.locator('#privacy .promise')).toContainText("TikTym never stores your recording");
  const ai = page.locator('#faq details', { hasText: 'Does TikTym use AI?' });
  await ai.locator('summary').click();
  await expect(ai.locator('p')).toContainText("It's optional");
  // AI is claimed only for voice: never for the coaching or insights
  expect(await page.locator('body').innerText()).not.toMatch(/AI[- ](coach|insight|powered)/i);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /Say what you did and AI logs it/);
});

test('the page sells what TikTym does, not that it is free; only the FAQ answers the price (GTM-22)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero .btn').first()).toHaveText('Start your 100 minutes');
  await expect(page.locator('.hero .facts li').first()).toHaveText('No ads');
  const faq = page.locator('#faq details', { hasText: 'Is TikTym free?' });
  await faq.locator('summary').click();
  await expect(faq.locator('p')).toContainText("we'll say so clearly before anything is charged");
  await faq.evaluate(e => e.remove()); // the one place that answers the price
  expect(await page.locator('body').innerText()).not.toMatch(/\bfree\b/i);
  for (const m of ['meta[name="description"]', 'meta[property="og:description"]'])
    await expect(page.locator(m)).not.toHaveAttribute('content', /\bfree\b/i);
});

test('every page has a search description of 25 to 160 characters (GTM-18)', async ({ page }) => {
  for (const path of ['/', '/updates/']) {
    await page.goto(path);
    const d = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(d.length, `${path}: "${d}"`).toBeGreaterThanOrEqual(25);
    expect(d.length, `${path}: "${d}"`).toBeLessThanOrEqual(160);
  }
  await page.goto('/');
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
  const app = (data['@graph'] as { '@type': string; description?: string }[]).find(g => g['@type'] === 'WebApplication')!;
  expect(app.description).toBe(await page.locator('meta[name="description"]').getAttribute('content'));
});

test.describe('install help on the website, for each phone and browser (GTM-19)', () => {
  test.describe('on an iPhone', () => {
    test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    test("iPhone guides first, Safari marked as your phone; no in-app warning in Safari", async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.install > div h3')).toHaveText([/^iPhone · Safari/, /^iPhone · Chrome/, /^Android · Chrome/, /^Android · Samsung Internet/]);
      await expect(page.locator('.install .mine h3')).toContainText('Your phone');
      await expect(page.locator('.install-warn')).toBeHidden();
    });
  });
  test('on a computer, the two guides with a video first, the two without as plain cards (GTM-20)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Website (desktop)', 'a phone puts its own guides first');
    await page.goto('/');
    const cards = page.locator('.install > div');
    await expect(cards.locator('h3')).toHaveText([/^iPhone · Safari/, /^Android · Chrome/, /^iPhone · Chrome/, /^Android · Samsung Internet/]);
    for (const [i, clips] of [[0, 1], [1, 1], [2, 0], [3, 0]]) await expect(cards.nth(i).locator('video')).toHaveCount(clips);
    // a card without a video is only as tall as its steps, never stretched to a video card's height
    const [video, plain] = [await cards.nth(0).boundingBox(), await cards.nth(2).boundingBox()];
    expect(plain!.height).toBeLessThan(video!.height / 2);
  });
  test.describe('Chrome on an iPhone', () => {
    test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1' });
    test('the iPhone Chrome guide first, marked as your phone', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.install > div h3').first()).toContainText('iPhone · Chrome');
      await expect(page.locator('.install .mine h3')).toContainText('Your phone');
    });
  });
  test.describe('Samsung Internet', () => {
    test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36' });
    test('the Samsung Internet guide first', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.install > div h3').first()).toContainText('Android · Samsung Internet');
    });
  });
  test.describe('inside Instagram on Android', () => {
    test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0' });
    test('Android guides first, with the open-in-browser warning', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.install > div h3').first()).toContainText('Android · Chrome');
      await expect(page.locator('.install-warn')).toBeVisible();
      await expect(page.locator('.install-warn')).toContainText('Open in browser');
    });
  });
});

test('install videos sit next to the iPhone Safari and Android Chrome guides, loading only when needed (GTM-20)', async ({ page, request }) => {
  await page.goto('/');
  for (const [platform, browser, name] of [['ios', 'safari', 'iphone-safari'], ['android', 'chrome', 'android-chrome']]) {
    const video = page.locator(`.install [data-platform="${platform}"][data-browser="${browser}"] video`);
    await expect(video).toHaveAttribute('src', `/install/${name}.mp4`);
    await expect(video).toHaveAttribute('preload', 'none');
    for (const ext of ['mp4', 'jpg']) expect((await request.get(`/install/${name}.${ext}`)).ok()).toBe(true);
  }
  await expect(page.locator('.install [data-browser="chrome"][data-platform="ios"] video')).toHaveCount(0); // no simulator for Chrome on iPhone
});
