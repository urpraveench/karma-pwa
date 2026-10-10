// Draws public/icons/badge-96.png: the small white TikTym ring Android shows in the status bar and at the top left of
// a reminder (NOTIF-09). Android uses only its shape (white on transparent). Run with `node scripts/badge-icon.mjs`.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/icons/badge-96.png', import.meta.url));
// The app icon's ring, simplified to stay clear at 24 pixels: 16 beads and the bigger bead on top.
const beads = Array.from({ length: 15 }, (_, i) => {
  const a = (-90 + (i + 1) * 360 / 16) * Math.PI / 180;
  return `<circle cx="${(48 + 36 * Math.cos(a)).toFixed(1)}" cy="${(48 + 36 * Math.sin(a)).toFixed(1)}" r="5.6" fill="#fff"/>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${beads}<circle cx="48" cy="12" r="9.5" fill="#fff"/></svg>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 96, height: 96 } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page.screenshot({ path: OUT, omitBackground: true });
await browser.close();
console.log(`wrote ${OUT}`);
