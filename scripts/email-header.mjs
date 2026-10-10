// Draws the header image for TikTym's emails (welcome, first-minute nudge) (site/email/header.png, 1200×240, shown at 600×120).
// Emails can't use SVG or web fonts reliably, so the mark and name are baked into a PNG.
// Run with `npm run email:header`, then deploy the website (`firebase deploy --only hosting:site`).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../site/email/header.png', import.meta.url));
mkdirSync(fileURLToPath(new URL('../site/email/', import.meta.url)), { recursive: true });

// The app mark: 27 beads, 18 filled, gold bead on top (as on the login screen).
const N = 27, beads = Array.from({ length: N }, (_, i) => {
  const a = (-90 + (i + 1) * 360 / (N + 1)) * Math.PI / 180;
  return `<circle cx="${(50 + 38 * Math.cos(a)).toFixed(1)}" cy="${(50 + 38 * Math.sin(a)).toFixed(1)}" r="3.6" fill="${i < 18 ? '#16302E' : '#CBD5CA'}"/>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@600&display=block" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box}
  body{width:600px;height:120px;background:#EDF0EA;display:flex;align-items:center;gap:16px;padding:0 32px;font-family:Figtree,sans-serif;color:#16302E}
  svg{width:60px;height:60px;flex:none}
  b{font:800 40px/1 "Bricolage Grotesque";letter-spacing:-.03em}
  span{margin-left:auto;font-size:15px;font-weight:600;color:#55685F}
</style></head><body>
  <svg viewBox="0 0 100 100">${beads}<circle cx="50" cy="12" r="6" fill="#C98E0E"/></svg>
  <b>TikTym</b><span>One minute, one point</span>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 600, height: 120 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT, type: 'png' });
await browser.close();
console.log('wrote', OUT);
