import { expect, test, type AndroidDevice, type Page } from '@playwright/test';
import { adb, connect, launch, newAccount, PKG, signIn } from './helpers';

// Speed on a low-end phone (AND-07). Run on the low-end emulator profile: 2 cores, 2 GB, 720×1600
// (`emulator -avd TikTym_LowEnd`, see README › Android). A Mac runs the emulator faster than a budget phone, so the
// scrolling check is also done with the WebView's CPU slowed 4× (Lighthouse's mid-tier mobile factor).

const SLOW = 4;
let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.afterAll(async () => { await device?.close(); });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** One cold start, the way people reopen the app (a while after it was closed, so the last run's storage lock has
 * lapsed): Android's launch time, and the WebView's own Largest Contentful Paint once `selector` is on screen. */
async function coldStart(selector: string): Promise<{ page: Page; native: number; web: number }> {
  adb('shell', 'am', 'force-stop', PKG);
  await sleep(6000);
  const native = Number(/TotalTime: (\d+)/.exec(adb('shell', 'am', 'start', '-W', '-n', `${PKG}/.MainActivity`))?.[1]);
  const page = await (await device.webView({ pkg: PKG }, { timeout: 30_000 })).page();
  // (page.waitForFunction doesn't follow Android's WebView reliably, so this asks every 100 ms)
  for (let waited = 0; !(await page.evaluate(sel => !!document.querySelector(sel), selector).catch(() => false)); waited += 100) {
    if (waited > 30_000) throw new Error(`${selector} not on screen 30 s after a cold start`);
    await sleep(100);
  }
  await sleep(800); // let painting settle so the last contentful paint is recorded
  const web = await page.evaluate(() => new Promise<number>(resolve => {
    new PerformanceObserver(list => resolve(Math.round(list.getEntries().at(-1)!.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => resolve(-1), 2000);
  }));
  return { page, native, web };
}

/** The median of three cold starts, after one warm-up (the first start after an install also prepares the app's code). */
async function medianColdStart(selector: string) {
  await coldStart(selector);
  const runs = [await coldStart(selector), await coldStart(selector), await coldStart(selector)];
  const mid = [...runs].sort((a, b) => (a.native + a.web) - (b.native + b.web))[1];
  return { ...mid, page: runs[2].page }; // the timings of the middle run; the page of the last, the one still open
}

/** Frame gaps while flinging Today up and down with real touch swipes, with the CPU slowed `rate`×. */
async function scrollFrames(page: Page, rate: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[] };
    w.__frames = [];
    const tick = (t: number) => { w.__frames.push(t); if (w.__frames.length < 2000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  for (let i = 0; i < 3; i++) {
    adb('shell', 'input', 'swipe', '360', '1250', '360', '350', '180');
    await sleep(700);
    adb('shell', 'input', 'swipe', '360', '350', '360', '1250', '180');
    await sleep(700);
  }
  const t = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames.splice(0));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
  const q = (p: number) => Math.round(d[Math.min(d.length - 1, Math.floor(p * d.length))]);
  return { frames: d.length, p50: q(.5), p95: q(.95), max: Math.round(d.at(-1)!), janky: +(d.filter(x => x > 50).length / d.length * 100).toFixed(1) };
}

test('a cold start shows the sign-in screen in about 2 seconds on a low-end phone (AND-07)', async () => {
  const { native, web } = await medianColdStart('.login h1');
  console.log(`AND-07 sign-in screen, cold start: Android launch ${native} ms + web ${web} ms = ${native + web} ms`);
  expect(web).toBeGreaterThan(0);
  expect(native + web).toBeLessThan(2000);
});

test('Today with 10 weeks of data: a cold start in about 2 seconds, and smooth scrolling, on a low-end phone (AND-07)', async () => {
  const first = await launch(device);
  await signIn(first, await newAccount());
  first.on('dialog', d => d.accept());
  await first.locator('.tab', { hasText: 'Setup' }).click();
  await first.locator('.li', { hasText: 'Load sample data' }).click();
  await first.locator('.tab', { hasText: 'Today' }).click();
  await expect(first.locator('.cat').first()).toBeVisible();
  await sleep(3000); // let the sample data reach the database before closing the app
  const { page, native, web } = await medianColdStart('.cat, .splash');
  console.log(`AND-07 Today (signed in, 10 weeks of data), cold start: Android launch ${native} ms + web ${web} ms = ${native + web} ms`);
  if (await page.locator('.splash').count()) await page.locator('.splash').click(); // the morning splash closes on a tap
  await expect(page.locator('.cat').first()).toBeVisible();
  const plain = await scrollFrames(page, 1), slowed = await scrollFrames(page, SLOW);
  console.log(`AND-07 scrolling Today, frame gaps in ms: ${JSON.stringify(plain)}; CPU ${SLOW}× slower: ${JSON.stringify(slowed)}`);
  expect(web).toBeGreaterThan(0);
  expect(native + web).toBeLessThan(2500);
  expect(plain.p95).toBeLessThanOrEqual(34);  // 30 frames a second or better almost all the time
  expect(slowed.janky).toBeLessThan(5);       // under 5% of frames take longer than 50 ms, even slowed down
});
