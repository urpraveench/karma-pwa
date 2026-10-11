// Draws TikTym's logo set into public/brand/ (served at app.tiktym.com/brand/): every lockup in every colour, as SVG
// (text turned into outlines, so it opens the same in Figma, Canva or Illustrator without the fonts) and PNG
// (transparent). Run with `npm run brand:kit` after changing the mark, the colours or the brand line.
import { chromium } from '@playwright/test';
import opentype from 'opentype.js';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/brand/', import.meta.url));
const TAGLINE = '100 minutes a day for your productive life';

// The fonts the app uses, as static TrueType files (Google serves those to an old browser), so the text can be outlined.
async function loadFont(family) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}`, { headers: { 'User-Agent': 'Mozilla/4.0' } })).text();
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`no TrueType file for ${family}`);
  return opentype.parse(await (await fetch(url)).arrayBuffer());
}
const display = await loadFont('Bricolage+Grotesque:opsz,wght@96,800');
const body = await loadFont('Figtree:wght@600');

// Colours from src/styles.css: ink, the empty beads, the gold bead, and the tagline's softer ink.
const THEMES = {
  color: { ink: '#16302E', rest: '#CBD5CA', gold: '#C98E0E', soft: '#55685F' }, // on light backgrounds
  'color-on-dark': { ink: '#E4ECE7', rest: '#3E5A55', gold: '#E6B23C', soft: '#93A89F' },
  black: { ink: '#000000', rest: 'rgba(0,0,0,.28)', gold: '#000000', soft: '#000000' }, // one colour, for print
  white: { ink: '#FFFFFF', rest: 'rgba(255,255,255,.32)', gold: '#FFFFFF', soft: '#FFFFFF' },
};

// The app mark (src/ui/icons.tsx › Mark): 27 beads, the first 18 filled, the gold bead on top. 100 units square.
const mark = (t, x = 0, y = 0, s = 1) => Array.from({ length: 27 }, (_, i) => {
  const a = (-90 + (i + 1) * 360 / 28) * Math.PI / 180;
  return `<circle cx="${(x + (50 + 38 * Math.cos(a)) * s).toFixed(2)}" cy="${(y + (50 + 38 * Math.sin(a)) * s).toFixed(2)}" r="${(3.6 * s).toFixed(2)}" fill="${i < 18 ? t.ink : t.rest}"/>`;
}).join('') + `<circle cx="${x + 50 * s}" cy="${y + 12 * s}" r="${6 * s}" fill="${t.gold}"/>`;

// Path data written out here: opentype.js's own toPathData turns some coordinates into NaN.
const n2 = v => +v.toFixed(2);
const pathData = p => p.commands.map(c => c.type === 'Z' ? 'Z'
  : c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter(v => v !== undefined).map(n2).join(' ')).join('');

/**
 * Text as an outline: its path, ink box and cap height, with the baseline at y. `spacing` is in ems, as in the app's CSS.
 * Glyphs are placed one by one with the font's kerning (opentype.js can't read every shaping table these fonts have).
 */
function text(font, str, size, spacing = 0) {
  const scale = size / font.unitsPerEm, glyphs = [...str].map(c => font.charToGlyph(c));
  const path = (x, y) => {
    const p = new opentype.Path();
    glyphs.forEach((g, i) => {
      p.extend(g.getPath(x, y, size));
      x += g.advanceWidth * scale + spacing * size + (glyphs[i + 1] ? font.getKerningValue(g, glyphs[i + 1]) * scale : 0);
    });
    return p;
  };
  const box = path(0, 0).getBoundingBox();
  return {
    at: (x, y, fill) => `<path fill="${fill}" d="${pathData(path(x, y))}"/>`,
    x1: box.x1, width: box.x2 - box.x1, cap: font.tables.os2.sCapHeight * scale, descent: box.y2,
  };
}

// Each lockup in mark units (the mark is 100). Returns the SVG body and its size.
const NAME = 'TikTym';
const LAYOUTS = {
  mark: t => ({ w: 100, h: 100, svg: mark(t) }),
  wordmark: t => {
    const n = text(display, NAME, 100, -0.03);
    return { w: n.width, h: n.cap + n.descent, svg: n.at(-n.x1, n.cap, t.ink) };
  },
  // The mark, then the name, its capitals centred on the mark.
  horizontal: t => {
    const n = text(display, NAME, 64, -0.03), x = 100 + 24;
    return { w: x + n.width, h: 100, svg: mark(t) + n.at(x - n.x1, 50 + n.cap / 2, t.ink) };
  },
  // The mark above the name, both centred.
  stacked: t => {
    const n = text(display, NAME, 50, -0.03), w = Math.max(100, n.width), base = 100 + 18 + n.cap;
    return { w, h: base + n.descent, svg: mark(t, (w - 100) / 2) + n.at((w - n.width) / 2 - n.x1, base, t.ink) };
  },
  // The mark, with the name and the brand line beside it.
  'tagline-horizontal': t => {
    const n = text(display, NAME, 56, -0.03), l = text(body, TAGLINE, 15.5), x = 100 + 24;
    const base = 50 + n.cap / 2 - 9;
    return { w: x + Math.max(n.width, l.width), h: 100, svg: mark(t) + n.at(x - n.x1, base, t.ink) + l.at(x - l.x1, base + 14 + l.cap, t.soft) };
  },
  // The mark, the name and the brand line, one under the other.
  'tagline-stacked': t => {
    const n = text(display, NAME, 50, -0.03), l = text(body, TAGLINE, 12.5), w = Math.max(100, n.width, l.width);
    const base = 100 + 18 + n.cap, lineBase = base + n.descent + 10 + l.cap;
    return { w, h: lineBase + l.descent, svg: mark(t, (w - 100) / 2) + n.at((w - n.width) / 2 - n.x1, base, t.ink) + l.at((w - l.width) / 2 - l.x1, lineBase, t.soft) };
  },
};

const PAD = 6; // breathing room, so nothing touches the edge
const PNG_LONG_SIDE = 2400, PNG_MARK = 1024;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}svg`, { recursive: true });
mkdirSync(`${OUT}png`, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const written = [];
for (const [layout, draw] of Object.entries(LAYOUTS)) {
  for (const [theme, t] of Object.entries(THEMES)) {
    const { w, h, svg } = draw(t);
    const W = +(w + PAD * 2).toFixed(2), H = +(h + PAD * 2).toFixed(2);
    const file = `tiktym-${layout}-${theme}`;
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${W} ${H}" width="${W}" height="${H}"><title>TikTym</title>${svg}</svg>\n`;
    writeFileSync(`${OUT}svg/${file}.svg`, doc);
    const scale = layout === 'mark' ? PNG_MARK / W : PNG_LONG_SIDE / Math.max(W, H);
    const pw = Math.round(W * scale), ph = Math.round(H * scale);
    await page.setViewportSize({ width: pw, height: ph });
    await page.setContent(`<html><body style="margin:0;background:transparent">${doc.replace(/width="[^"]+" height="[^"]+"/, `width="${pw}" height="${ph}"`)}</body></html>`);
    await page.screenshot({ path: `${OUT}png/${file}.png`, omitBackground: true, clip: { x: 0, y: 0, width: pw, height: ph } });
    written.push(file);
  }
}

// The app icon (the mark on its dark tile), for profile pictures and app stores.
const ICON = fileURLToPath(new URL('../public/icons/icon.svg', import.meta.url));
copyFileSync(ICON, `${OUT}svg/tiktym-app-icon.svg`);
await page.setViewportSize({ width: 1024, height: 1024 });
await page.setContent(`<html><body style="margin:0;background:transparent">${readFileSync(ICON, 'utf8').replace('<svg ', '<svg width="1024" height="1024" ')}</body></html>`);
await page.screenshot({ path: `${OUT}png/tiktym-app-icon.png`, omitBackground: true });
await browser.close();
console.log(`wrote ${written.length * 2 + 2} files to ${OUT}`);
