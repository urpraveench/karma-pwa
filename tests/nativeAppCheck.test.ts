import { describe, expect, it, vi } from 'vitest';
import { nativeAppCheckMode, nativeAppCheckToken, type NativeAppCheckPlugin } from '../src/lib/nativeAppCheck';

const plugin = (over: Partial<NativeAppCheckPlugin> = {}): NativeAppCheckPlugin => ({
  initialize: vi.fn(async () => {}),
  getToken: vi.fn(async () => ({ token: 'jwt', expireTimeMillis: 5000 })),
  ...over,
});

describe('App Check in the Android app (AND-04)', () => {
  it('uses Play Integrity or the debug provider only when the build asks for one (AND-04)', () => {
    expect(nativeAppCheckMode('play')).toBe('play');
    expect(nativeAppCheckMode('debug')).toBe('debug');
    expect(nativeAppCheckMode('')).toBeNull();
    expect(nativeAppCheckMode(undefined)).toBeNull();
  });

  it('starts Android App Check once, then hands its token to the web SDK (AND-04)', async () => {
    const p = plugin(), load = vi.fn(async () => ({ FirebaseAppCheck: p }));
    const getToken = nativeAppCheckToken(load, 'play');
    expect(await getToken()).toEqual({ token: 'jwt', expireTimeMillis: 5000 });
    await getToken();
    expect(load).toHaveBeenCalledTimes(1);
    expect(p.initialize).toHaveBeenCalledTimes(1);
    expect(p.initialize).toHaveBeenCalledWith({ debugToken: false, isTokenAutoRefreshEnabled: true });
    expect(p.getToken).toHaveBeenCalledTimes(2);
  });

  it('debug builds use the debug provider (AND-04)', async () => {
    const p = plugin();
    await nativeAppCheckToken(async () => ({ FirebaseAppCheck: p }), 'debug')();
    expect(p.initialize).toHaveBeenCalledWith({ debugToken: true, isTokenAutoRefreshEnabled: true });
  });

  it('a token without an expiry is refreshed after 30 minutes (AND-04)', async () => {
    const p = plugin({ getToken: async () => ({ token: 'jwt' }) });
    expect(await nativeAppCheckToken(async () => ({ FirebaseAppCheck: p }), 'play', () => 1000)()).toEqual({ token: 'jwt', expireTimeMillis: 1000 + 30 * 60_000 });
  });

  it('a failed start is tried again on the next call, and a failed token is passed on (AND-04)', async () => {
    let fail = true;
    const p = plugin({ initialize: vi.fn(async () => { if (fail) throw new Error('not ready'); }) });
    const getToken = nativeAppCheckToken(async () => ({ FirebaseAppCheck: p }), 'play');
    await expect(getToken()).rejects.toThrow('not ready');
    fail = false;
    expect((await getToken()).token).toBe('jwt');
    const bad = plugin({ getToken: async () => { throw new Error('Integrity API error'); } });
    await expect(nativeAppCheckToken(async () => ({ FirebaseAppCheck: bad }), 'play')()).rejects.toThrow('Integrity API error');
  });
});
