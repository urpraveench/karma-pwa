import { describe, expect, it } from 'vitest';
import { AUTO_RELOAD_GAP, isMissingCode, OFFLINE, shouldAutoReload, startErrorMessage } from '../src/lib/startError';

describe('start errors', () => {
  it('says TikTym couldn\'t finish loading, with no developer hints (AUTH-22)', () => {
    const msg = startErrorMessage('start', true);
    expect(msg).toBe('TikTym couldn\'t finish loading. Check your connection, then tap Reload.');
    expect(msg).not.toMatch(/env|Firebase|Firestore|rules/i);
  });

  it('says the practices couldn\'t load, with no developer hints (FIRST-04)', () => {
    const msg = startErrorMessage('data', true);
    expect(msg).toBe('Couldn\'t load your practices. Check your connection, then tap Reload.');
    expect(msg).not.toMatch(/env|Firebase|Firestore|rules/i);
  });

  it('says offline when the device is offline (AUTH-22, FIRST-04)', () => {
    expect(startErrorMessage('start', false)).toBe(OFFLINE);
    expect(startErrorMessage('data', false)).toBe('You\'re offline. Connect to the internet, then tap Reload.');
  });
});

describe('a copy from before an update reloads itself once (APP-33)', () => {
  const chrome = new TypeError('Failed to fetch dynamically imported module: https://app.tiktym.com/assets/firebaseClient-old.js');
  const safari = new TypeError('Importing a module script failed.');
  const firefox = new TypeError('error loading dynamically imported module');
  const now = 1_000_000;

  it('recognises missing code in Chrome, Safari and Firefox, and nothing else (APP-33)', () => {
    for (const e of [chrome, safari, firefox]) expect(isMissingCode(e)).toBe(true);
    expect(isMissingCode(new Error('auth/network-request-failed'))).toBe(false);
    expect(isMissingCode(undefined)).toBe(false);
  });

  it('reloads the first time, online, for missing code only (APP-33)', () => {
    expect(shouldAutoReload(chrome, null, now, true)).toBe(true);
    expect(shouldAutoReload(chrome, null, now, false)).toBe(false); // offline: say offline instead
    expect(shouldAutoReload(new Error('other'), null, now, true)).toBe(false);
  });

  it('doesn\'t reload again within a minute, so it can never loop (APP-33)', () => {
    expect(shouldAutoReload(chrome, now - 5_000, now, true)).toBe(false);
    expect(shouldAutoReload(chrome, now - AUTO_RELOAD_GAP - 1, now, true)).toBe(true);
  });
});
