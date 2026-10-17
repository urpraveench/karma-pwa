import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error: a plain .mjs script, without types
import { dropWebOnly, WEB_ONLY } from '../scripts/native-web-only.mjs';

describe('Android app download (AND-12)', () => {
  it('leaves the website-only files out of the native build and keeps the rest', () => {
    const root = mkdtempSync(join(tmpdir(), 'tiktym-native-')), out = join(root, 'dist-android');
    mkdirSync(join(out, 'brand/svg'), { recursive: true });
    mkdirSync(join(out, 'icons'));
    for (const f of ['brand/svg/ring.svg', 'og.png', 'push-sw.js', 'robots.txt', 'index.html', 'version.json', 'icons/icon.svg']) writeFileSync(join(out, f), 'x');
    const plugin = dropWebOnly();
    plugin.configResolved({ root, build: { outDir: 'dist-android' } });
    plugin.closeBundle();
    for (const f of WEB_ONLY) expect(existsSync(join(out, f)), f).toBe(false);
    for (const f of ['index.html', 'version.json', 'icons/icon.svg']) expect(existsSync(join(out, f)), f).toBe(true);
  });

  it('names files that are really in public/, and only the native build drops them', () => {
    for (const f of WEB_ONLY) expect(existsSync(join('public', f)), f).toBe(true);
    expect(readFileSync('vite.config.ts', 'utf8')).toContain('NATIVE && dropWebOnly()');
  });
});
