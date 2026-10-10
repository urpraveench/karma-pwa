import { describe, expect, it } from 'vitest';
import { dismissInstall, installEnv, showInstallCard, type InstallNudge } from '../src/lib/install';

const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0',
  androidWebView: 'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36',
  facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

describe('where are we installing from (APP-27 to APP-29)', () => {
  it('knows an installed app, a browser that offers its dialog, iPhone, Android and a computer', () => {
    expect(installEnv({ ua: UA.iphoneSafari, standalone: true, canPrompt: false })).toBe('installed');
    expect(installEnv({ ua: UA.androidChrome, standalone: false, canPrompt: true })).toBe('prompt');
    expect(installEnv({ ua: UA.iphoneSafari, standalone: false, canPrompt: false })).toBe('ios');
    expect(installEnv({ ua: UA.iphoneChrome, standalone: false, canPrompt: false })).toBe('ios-chrome');
    expect(installEnv({ ua: UA.androidChrome, standalone: false, canPrompt: false })).toBe('android');
    expect(installEnv({ ua: UA.mac, standalone: false, canPrompt: false })).toBe('other');
  });

  it("spots apps' built-in browsers, where installing is impossible", () => {
    for (const ua of [UA.iphoneInstagram, UA.androidWebView, UA.facebook])
      expect(installEnv({ ua, standalone: false, canPrompt: false })).toBe('in-app');
  });
});

describe('when the card shows on Today (APP-30)', () => {
  const fresh: InstallNudge = { dismissals: 0 };
  const T = '2026-10-10';

  it('only after the first minutes are logged, and never when installed or on a computer', () => {
    expect(showInstallCard({ env: 'ios', hasLogged: false, nudge: fresh, today: T })).toBe(false);
    expect(showInstallCard({ env: 'ios', hasLogged: true, nudge: fresh, today: T })).toBe(true);
    expect(showInstallCard({ env: 'in-app', hasLogged: true, nudge: fresh, today: T })).toBe(true);
    expect(showInstallCard({ env: 'installed', hasLogged: true, nudge: fresh, today: T })).toBe(false);
    expect(showInstallCard({ env: 'other', hasLogged: true, nudge: fresh, today: T })).toBe(false);
  });

  it('Not now hides it for 3 days; a second Not now ends it', () => {
    const once = dismissInstall(fresh, T);
    expect(once).toEqual({ dismissals: 1, until: '2026-10-13' });
    expect(showInstallCard({ env: 'ios', hasLogged: true, nudge: once, today: '2026-10-12' })).toBe(false);
    expect(showInstallCard({ env: 'ios', hasLogged: true, nudge: once, today: '2026-10-13' })).toBe(true);
    const twice = dismissInstall(once, '2026-10-13');
    expect(showInstallCard({ env: 'ios', hasLogged: true, nudge: twice, today: '2026-12-01' })).toBe(false);
  });
});
