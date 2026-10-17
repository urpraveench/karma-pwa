import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const scripts: Record<string, string> = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const gradle = readFileSync('android/app/build.gradle', 'utf8');

describe('Play build (AND-10)', () => {
  it('makes a signed app bundle with Play Integrity App Check against the live project', () => {
    const release = scripts['android:release'];
    expect(release).toContain('VITE_ANDROID_APPCHECK=play');
    expect(release).toContain('VITE_BACKEND=firebase');
    expect(release).toMatch(/VITE_USE_EMULATORS= /);
    expect(release).not.toContain('TIKTYM_EMULATORS');
    expect(release).toContain('./gradlew bundleRelease');
  });

  it('gives each upload a higher version code: the version times 100 plus a build number (AND-06)', () => {
    expect(gradle).toContain("System.getenv('TIKTYM_ANDROID_BUILD') ?: '0'");
    expect(gradle).toContain('(it[0] * 1000000 + it[1] * 1000 + it[2]) * 100 + androidBuild');
    expect(gradle).toContain('versionCode appVersionCode');
  });

  it('keeps Play Integrity out of the debug builds', () => {
    for (const name of ['android:build', 'android:build:test']) expect(scripts[name]).toContain('VITE_ANDROID_APPCHECK=debug');
  });

  it('signs with an upload key from outside the repo, and stops without it', () => {
    expect(gradle).toContain("System.getenv('TIKTYM_UPLOAD_KEY') ?: \"${System.getProperty('user.home')}/.tiktym/upload-key.properties\"");
    expect(gradle).toMatch(/release \{\s*signingConfig signingConfigs\.release/);
    expect(gradle).toContain('throw new GradleException("No upload key at');
  });

  it('has no key or password in the repo', () => {
    const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
    expect(tracked.filter(f => /\.(jks|keystore|p12)$|upload-key/i.test(f))).toEqual([]);
    expect(gradle).not.toMatch(/storePassword\s+['"]/);
  });
});
