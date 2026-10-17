// Draws the Android app's icon and splash screen (AND-11) from the app icon (public/icons/icon.svg) and the brand ring
// (public/brand/svg/tiktym-mark-color.svg and -color-on-dark.svg), so they never drift from the logo. Run with
// `npm run android:icons`. The XML files come from androidIconFiles(), which is pure and unit-tested against the files
// on disk (tests/androidIcons.test.ts); the PNGs, only for Android 7 (no adaptive icons), are drawn in Chrome.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RES = 'android/app/src/main/res';

/** The circles of an SVG: centre, radius and fill. */
export const circles = svg => [...svg.replace(/<metadata>.*?<\/metadata>/s, '').matchAll(/<circle\b[^>]*>/g)].map(([c]) => {
  const a = n => c.match(new RegExp(`\\b${n}="([^"]*)"`))?.[1];
  return { cx: +a('cx'), cy: +a('cy'), r: +a('r'), fill: a('fill') };
});
const tileColour = svg => svg.match(/<rect\b[^>]*fill="([^"]*)"/)[1];
/** A bead's part in the ring: the gold one (the biggest), the 18 filled, or the ones still to fill. */
export const role = (c, all) => (c.r === Math.max(...all.map(d => d.r)) ? 'gold' : all.filter(d => d.fill === c.fill).length === 18 ? 'filled' : 'empty');

const n = v => +v.toFixed(2);
const dot = ({ cx, cy, r }) => `M${n(cx - r)},${n(cy)}a${n(r)},${n(r)} 0 1,0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1,0 ${n(-2 * r)},0`;
const vector = (paths, comment) => `<?xml version="1.0" encoding="utf-8"?>
<!-- ${comment} Drawn by scripts/android-icons.mjs (AND-11); don't edit by hand. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
${paths.map(p => `    <path android:fillColor="${p.fill}"${p.alpha ? ` android:fillAlpha="${p.alpha}"` : ''} android:pathData="${dot(p)}"/>`).join('\n')}
</vector>
`;

/** Moves circles drawn around (from, from) at scale 1 to around (54, 54), Android's 108-unit icon, at `scale`. */
const place = (cs, from, scale) => cs.map(c => ({ ...c, cx: 54 + (c.cx - from) * scale, cy: 54 + (c.cy - from) * scale, r: c.r * scale }));

/**
 * The XML files, by path under android/app/src/main/res. `icon` is public/icons/icon.svg (a 100-unit tile), `light` and
 * `dark` the brand ring in colour for light and dark backgrounds (centred on 50).
 */
export function androidIconFiles({ icon, light, dark }) {
  // The adaptive icon shows about 72 of its 108 units, inside the phone's mask: the tile's 100 units map onto those 72,
  // so the ring fills the icon as it does on the web, well inside the 66-unit circle every mask keeps.
  const ring = place(circles(icon), 50, 0.72);
  // The splash ring: the brand ring at 62%, inside the two-thirds circle Android keeps on the splash screen.
  const brand = circles(light);
  const splash = place(brand.map(c => ({ ...c, fill: `@color/splash_${role(c, brand)}` })), 50, 0.62);
  const colours = (svg, bg) => {
    const all = circles(svg), of = r => all.find(c => role(c, all) === r).fill;
    return `<?xml version="1.0" encoding="utf-8"?>
<!-- The splash screen's colours: the app's background and the brand ring for it. Drawn by scripts/android-icons.mjs (AND-11). -->
<resources>
    <color name="splash_bg">${bg}</color>
    <color name="splash_filled">${of('filled')}</color>
    <color name="splash_empty">${of('empty')}</color>
    <color name="splash_gold">${of('gold')}</color>
</resources>
`;
  };
  const launcher = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;
  return {
    'values/ic_launcher_background.xml': `<?xml version="1.0" encoding="utf-8"?>
<!-- The app icon's tile, as in public/icons/icon.svg. Drawn by scripts/android-icons.mjs (AND-11). -->
<resources>
    <color name="ic_launcher_background">${tileColour(icon)}</color>
</resources>
`,
    'drawable/ic_launcher_foreground.xml': vector(ring, 'The app icon\'s ring, as in public/icons/icon.svg, on the tile colour.'),
    // Android colours a themed icon itself; only the shape and alpha count, so the beads still to fill stay faint.
    'drawable/ic_launcher_monochrome.xml': vector(ring.map(c => ({ ...c, fill: '#FF000000', alpha: role(c, ring) === 'empty' ? '0.35' : undefined })), 'The app icon\'s ring in one colour, for Android\'s themed icons.'),
    'mipmap-anydpi-v26/ic_launcher.xml': launcher,
    'mipmap-anydpi-v26/ic_launcher_round.xml': launcher,
    'drawable/splash_icon.xml': vector(splash, 'The splash screen\'s ring, in the colours for the app\'s background (values-night: dark).'),
    'drawable/splash.xml': `<?xml version="1.0" encoding="utf-8"?>
<!-- The splash screen before Android 12 (later versions use the theme's windowSplashScreen items). Drawn by scripts/android-icons.mjs (AND-11). -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_bg"/>
    <item android:drawable="@drawable/splash_icon" android:gravity="center" android:width="216dp" android:height="216dp"/>
</layer-list>
`,
    'values/splash.xml': colours(light, '#EDF0EA'),
    'values-night/splash.xml': colours(dark, '#0F1B19'),
  };
}

/** Capacitor's placeholder files, replaced by the ones above. */
export const PLACEHOLDERS = [
  'drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml', 'drawable/splash.png',
  ...['land', 'port'].flatMap(o => ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].map(d => `drawable-${o}-${d}/splash.png`)),
  ...['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].map(d => `mipmap-${d}/ic_launcher_foreground.png`),
];

/** Launcher sizes in pixels for Android 7, which has no adaptive icons. */
export const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

export const sources = () => ({
  icon: readFileSync('public/icons/icon.svg', 'utf8'),
  light: readFileSync('public/brand/svg/tiktym-mark-color.svg', 'utf8'),
  dark: readFileSync('public/brand/svg/tiktym-mark-color-on-dark.svg', 'utf8'),
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.chdir(fileURLToPath(new URL('..', import.meta.url)));
  const src = sources();
  for (const [path, xml] of Object.entries(androidIconFiles(src))) {
    mkdirSync(dirname(`${RES}/${path}`), { recursive: true });
    writeFileSync(`${RES}/${path}`, xml);
  }
  for (const path of PLACEHOLDERS) rmSync(`${RES}/${path}`, { force: true });
  // Android 7: the tile as it is on the web (rounded square) and in a circle for launchers that ask for a round icon.
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'chrome' });
  const svg = src.icon.replace(/<metadata>.*?<\/metadata>/s, '');
  for (const [density, px] of Object.entries(LEGACY)) {
    const page = await browser.newPage({ viewport: { width: px, height: px } });
    for (const [name, html] of [['ic_launcher', svg], ['ic_launcher_round', svg.replace(/<rect\b[^>]*rx="22"/, m => m.replace('rx="22"', 'rx="50"'))]]) {
      await page.setContent(`<html><body style="margin:0;background:transparent">${html.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
      await page.screenshot({ path: `${RES}/mipmap-${density}/${name}.png`, omitBackground: true });
    }
    await page.close();
  }
  await browser.close();
  console.log('wrote the Android icon and splash screen');
}
