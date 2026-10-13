import { describe, expect, it } from 'vitest';
import { nativeGoogleMsg } from '../src/auth';

// What the Android app says when its own Google account picker fails (AND-03).
describe('nativeGoogleMsg (AND-03)', () => {
  it('says nothing when the person closes the picker', () => {
    expect(nativeGoogleMsg(new Error('activity is cancelled by the user.'))).toBeNull();
    expect(nativeGoogleMsg(new Error('Authorization canceled.'))).toBeNull();
  });

  it('tells a phone with no Google account where to add one', () => {
    expect(nativeGoogleMsg(new Error('No credentials available'))).toMatch(/Add a Google account to this phone/);
  });

  it('passes anything else on', () => {
    expect(nativeGoogleMsg(new Error('Developer console is not set up correctly.'))).toBe('Google sign-in failed: Developer console is not set up correctly.');
  });
});
