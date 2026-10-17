import { describe, expect, it } from 'vitest';
import { nativeGoogleIdToken, nativeGoogleMsg } from '../src/auth';

// What the Android app says when its own Google account picker fails (AND-03).
describe('nativeGoogleMsg (AND-03)', () => {
  it('says nothing when the person closes the picker', () => {
    expect(nativeGoogleMsg(new Error('activity is cancelled by the user.'))).toBeNull();
    expect(nativeGoogleMsg(new Error('Authorization canceled.'))).toBeNull();
    expect(nativeGoogleMsg(new Error('12501: '))).toBeNull();
  });

  it('tells a phone with no Google account where to add one', () => {
    expect(nativeGoogleMsg(new Error('No credentials available'))).toMatch(/Add a Google account to this phone/);
  });

  it('passes anything else on', () => {
    expect(nativeGoogleMsg(new Error('Developer console is not set up correctly.'))).toBe('Google sign-in failed: Developer console is not set up correctly.');
  });
});

describe('nativeGoogleIdToken (AND-03)', () => {
  it('uses Credential Manager when the phone has it', async () => {
    const calls: unknown[] = [];
    expect(await nativeGoogleIdToken(async o => { calls.push(o); return { credential: { idToken: 't1' } }; })).toBe('t1');
    expect(calls).toEqual([{ skipNativeAuth: true }]);
  });

  it("falls back to Google's older account picker on a phone without Credential Manager", async () => {
    for (const msg of ["Your device doesn't support credential manager", 'getCredentialAsync no provider dependencies found - please ensure the desired provider dependencies are added']) {
      const calls: unknown[] = [];
      const token = await nativeGoogleIdToken(async o => {
        calls.push(o);
        if (o.useCredentialManager !== false) throw new Error(msg);
        return { credential: { idToken: 't2' } };
      });
      expect(token).toBe('t2');
      expect(calls).toEqual([{ skipNativeAuth: true }, { skipNativeAuth: true, useCredentialManager: false }]);
    }
  });

  it('passes other failures on without a second try', async () => {
    let n = 0;
    await expect(nativeGoogleIdToken(async () => { n++; throw new Error('activity is cancelled by the user.'); })).rejects.toThrow(/cancelled/);
    expect(n).toBe(1);
  });
});
