import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
// @ts-expect-error: a plain .mjs script, without types
import { androidIconFiles, circles, LEGACY, PLACEHOLDERS, role, sources } from '../scripts/android-icons.mjs';

const RES = 'android/app/src/main/res';
type Circle = { cx: number; cy: number; r: number; fill: string };
const files: Record<string, string> = androidIconFiles(sources());
const dots = (xml: string) => [...xml.matchAll(/fillColor="([^"]*)"(?: android:fillAlpha="([^"]*)")? android:pathData="M([\d.]+),([\d.]+)a([\d.]+)/g)]
  .map(([, fill, alpha, x, y, r]) => ({ fill, alpha, cx: +x + +r, cy: +y, r: +r }));

describe('Android icon and splash screen (AND-11)', () => {
  it('matches what npm run android:icons draws from the app icon and the brand ring', () => {
    for (const [path, xml] of Object.entries(files)) expect(readFileSync(`${RES}/${path}`, 'utf8'), path).toBe(xml);
  });

  it("leaves none of Capacitor's placeholder icon or splash", () => {
    for (const path of PLACEHOLDERS) expect(existsSync(`${RES}/${path}`), path).toBe(false);
    for (const [density] of Object.entries(LEGACY)) for (const name of ['ic_launcher', 'ic_launcher_round']) expect(existsSync(`${RES}/mipmap-${density}/${name}.png`)).toBe(true);
  });

  it("is the app icon's ring on its dark green tile, inside the circle every phone's mask keeps", () => {
    const icon = circles(sources().icon) as Circle[];
    const ring = dots(files['drawable/ic_launcher_foreground.xml']);
    expect(ring).toHaveLength(28);
    expect(ring.map(d => d.fill)).toEqual(icon.map(c => c.fill));
    for (const d of ring) expect(Math.hypot(d.cx - 54, d.cy - 54) + d.r).toBeLessThanOrEqual(33);
    expect(files['values/ic_launcher_background.xml']).toContain('#16302E');
    expect(files['mipmap-anydpi-v26/ic_launcher.xml']).toContain('<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>');
  });

  it('has a one-colour version for themed icons, with the beads still to fill faint', () => {
    const mono = dots(files['drawable/ic_launcher_monochrome.xml']);
    expect(new Set(mono.map(d => d.fill))).toEqual(new Set(['#FF000000']));
    expect(mono.filter(d => d.alpha === '0.35')).toHaveLength(9);
  });

  it("shows the brand ring on the app's background while opening, light or dark, with the gold bead on top", () => {
    const ring = dots(files['drawable/splash_icon.xml']);
    const gold = ring.find(d => d.fill === '@color/splash_gold')!;
    expect(ring.filter(d => d.fill === '@color/splash_gold')).toHaveLength(1);
    expect(gold.cy).toBeLessThan(Math.min(...ring.filter(d => d !== gold).map(d => d.cy)) + 1);
    for (const d of ring) expect(Math.hypot(d.cx - 54, d.cy - 54) + d.r).toBeLessThanOrEqual(36);
    expect(files['values/splash.xml']).toContain('<color name="splash_bg">#EDF0EA</color>');
    expect(files['values-night/splash.xml']).toContain('<color name="splash_bg">#0F1B19</color>');
    const brand = circles(sources().dark) as Circle[];
    expect(files['values-night/splash.xml']).toContain(`<color name="splash_gold">${brand.find(c => role(c, brand) === 'gold')!.fill}</color>`);
    const styles = readFileSync(`${RES}/values/styles.xml`, 'utf8');
    expect(styles).toContain('<item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>');
    expect(styles).toContain('<item name="windowSplashScreenBackground">@color/splash_bg</item>');
  });
});
