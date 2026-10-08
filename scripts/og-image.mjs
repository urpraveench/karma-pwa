// Draws the link-preview image (public/og.png, 1200×630) shown when TikTym is shared on WhatsApp,
// LinkedIn, X or Slack. Run with `npm run og:image` after changing the pitch or brand.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/og.png', import.meta.url));

// The mala: 108 beads, the first 70 filled, gold marker on top (as on the Today screen).
const beads = Array.from({ length: 108 }, (_, i) => {
  const a = (-90 + (i + 1) * 360 / 109) * Math.PI / 180;
  const fill = i < 70 ? '#5BC08F' : i < 84 ? '#F07A68' : '#2C433F';
  return `<circle cx="${(200 + 168 * Math.cos(a)).toFixed(1)}" cy="${(200 + 168 * Math.sin(a)).toFixed(1)}" r="5.2" fill="${fill}"/>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@500;700&display=block" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0F1B19;color:#E4ECE7;font-family:Figtree,sans-serif;display:flex;align-items:center;gap:56px;padding:0 80px}
  .mala{flex:none;width:400px;height:400px;position:relative}
  .mala b{position:absolute;inset:0;display:grid;place-items:center;font:800 84px/1 "Bricolage Grotesque";letter-spacing:-.03em}
  .mala b small{display:block;font:500 22px Figtree;color:#93A89F;letter-spacing:0;margin-top:6px;text-align:center}
  h1{font:800 92px/1 "Bricolage Grotesque";letter-spacing:-.03em}
  p{font-size:34px;line-height:1.3;margin-top:22px;color:#E4ECE7;max-width:640px}
  .tag{margin-top:34px;font-size:22px;font-weight:700;color:#E6B23C}
</style></head><body>
  <div class="mala"><svg viewBox="0 0 400 400" width="400" height="400">${beads}<circle cx="200" cy="32" r="10" fill="#E6B23C"/></svg>
    <b><span>45<small>minutes left today</small></span></b></div>
  <div><h1>TikTym</h1>
    <p>Make time for what you're learning. One minute, one point. Busy weeks carry forward, never pile up.</p>
    <div class="tag">Free · Works offline · Made in India</div></div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT, type: 'png' });
await browser.close();
console.log('wrote', OUT);
