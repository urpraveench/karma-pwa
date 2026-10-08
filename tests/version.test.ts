import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BUILD, buildLabel, isDifferentBuild } from '../src/version';

describe('build version (APP-23)', () => {
  it('comes from package.json, with a commit and a build time', () => {
    expect(BUILD.version).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
    expect(BUILD.commit).toMatch(/^([0-9a-f]{7,}|unknown)(-dirty)?$/);
    expect(Number.isNaN(Date.parse(BUILD.builtAt))).toBe(false);
  });

  it('labels a build as "TikTym <version> · <commit> · <date>"', () => {
    expect(buildLabel({ version: '1.2.3', commit: 'abc1234', builtAt: '2026-10-08T10:00:00Z' })).toMatch(/^TikTym 1\.2\.3 · abc1234 · .*2026$/);
  });

  it('spots a different build by version or by commit', () => {
    const own = { version: '1.0.0', commit: 'aaaaaaa', builtAt: '' };
    expect(isDifferentBuild({ version: '1.0.0', commit: 'aaaaaaa' }, own)).toBe(false);
    expect(isDifferentBuild({ version: '1.0.1', commit: 'aaaaaaa' }, own)).toBe(true);
    expect(isDifferentBuild({ version: '1.0.0', commit: 'bbbbbbb' }, own)).toBe(true);
  });
});
