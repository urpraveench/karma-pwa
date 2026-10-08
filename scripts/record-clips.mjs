// Records the website's feature clips from the real app: `npm run site:clips`.
// Builds the app in test mode, loads sample data off-camera, then records each scene in a phone-sized window
// on a fixed date, and converts it to a small looping MP4 (plays everywhere, iPhone included) plus a poster image.
// Output: site/clips/<name>.mp4 and <name>.jpg. Re-run after any visible change to the app.
import { chromium } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'site', 'clips');
const PORT = 4178, URL_ = `http://localhost:${PORT}/`;
const NOW = new Date(2026, 9, 7, 19, 30); // a Wednesday evening: a full day of entries, with some left to do
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB', timezoneId: 'Asia/Kolkata' };
const pause = (page, ms) => page.waitForTimeout(ms);

// --- build and serve the app in test mode ---
execFileSync('npx', ['vite', 'build', '--outDir', 'dist-clips', '--emptyOutDir'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, VITE_BACKEND: 'local', VITE_SHOW_DEV_HINT: 'false' } });
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-clips', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(URL_)).ok) break; } catch { /* starting */ } await new Promise(r => setTimeout(r, 500)); }

const browser = await chromium.launch({ channel: 'chrome' });
mkdirSync(OUT, { recursive: true });

// --- sample data, off-camera; its dates are relative to NOW ---
const prep = await browser.newContext(PHONE);
const p0 = await prep.newPage();
await p0.clock.install({ time: NOW });
p0.on('dialog', d => d.accept());
await p0.goto(URL_);
await p0.fill('#em', 'demo@tiktym.local');
await p0.fill('#pw', 'tiktym123');
await p0.click('button[type=submit]');
await p0.locator('.tab', { hasText: 'Setup' }).click();
await p0.locator('.li', { hasText: 'Load sample data' }).click();
await p0.locator('.tab', { hasText: 'Today' }).click();
await p0.evaluate(() => { localStorage.setItem('tiktym:tip-timer', '1'); }); // no first-run tip in the clips
const state = await prep.storageState();
await prep.close();

/** Records one scene; `scene` runs once the app is on screen. Returns the trimmed MP4's size. */
async function record(name, scene, { at = NOW, seconds } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'tiktym-clip-'));
  const ctx = await browser.newContext({ ...PHONE, storageState: state, recordVideo: { dir, size: { width: 780, height: 1688 } } });
  const page = await ctx.newPage();
  const started = Date.now();
  await page.clock.install({ time: at });
  page.on('dialog', d => d.accept());
  await page.goto(URL_);
  await page.locator('.hello').waitFor();
  const from = (Date.now() - started) / 1000; // skip the blank frames before the app appears
  await scene(page);
  const video = page.video();
  await ctx.close();
  const raw = await video.path();
  const mp4 = join(OUT, `${name}.mp4`), jpg = join(OUT, `${name}.jpg`);
  const trim = ['-ss', from.toFixed(2), ...(seconds ? ['-t', String(seconds)] : [])];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...trim, '-i', raw, '-vf', 'scale=600:-2,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2.5', '-i', mp4, '-frames:v', '1', '-q:v', '4', jpg]);
  rmSync(dir, { recursive: true, force: true });
  return `${name}.mp4 ${(statSync(mp4).size / 1024).toFixed(0)} KB`;
}

const results = [];

// 1. Today: the mala fills in, then one tap logs what's left of a practice.
results.push(await record('today', async page => {
  await pause(page, 2200);
  const row = page.locator('.cat').filter({ has: page.locator('.qbtn:not(.done)') }).first();
  await row.locator('.qbtn').click();
  await pause(page, 2600);
}));

// 2. Focus timer: beads fill as minutes pass, gold at the target, then minimise to the mini-player.
results.push(await record('timer', async page => {
  await pause(page, 800);
  await page.locator('.cat').filter({ has: page.locator('.qbtn:not(.done)') }).first().locator('.tbtn').click();
  await pause(page, 1200);
  const goal = Number((await page.locator('.f-goal .chip[aria-pressed=true]').textContent()).match(/\d+/)[0]);
  // jump a minute at a time (runFor would replay every one-second tick and take far longer than the clip)
  for (let m = 0; m <= goal; m++) { await page.clock.fastForward(60_000); await pause(page, 3000 / goal); }
  await pause(page, 1800);
  await page.click('.f-min');
  await pause(page, 2000);
}));

// 3. Backlog: a practice with minutes carried over, cleared with "All that's left".
results.push(await record('backlog', async page => {
  await pause(page, 1200);
  const carried = page.locator('.cat').filter({ hasText: 'carried' }).first();
  await carried.scrollIntoViewIfNeeded();
  await pause(page, 1400);
  await carried.locator('.cat-open').click();
  await pause(page, 1500);
  await page.click('.tile-all');
  await pause(page, 2600);
}));

// 4. Insights: coaching, this week against last, consistency and practice health.
results.push(await record('insights', async page => {
  await page.locator('.tab', { hasText: 'Insights' }).click();
  await pause(page, 2600); // time to read the coaching
  for (let i = 0; i < 18; i++) { await page.mouse.wheel(0, 50); await pause(page, 160); }
  await pause(page, 1800);
}));

await browser.close();
server.kill();
rmSync(join(ROOT, 'dist-clips'), { recursive: true, force: true });
console.log(results.join('\n'));
