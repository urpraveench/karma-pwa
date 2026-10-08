import { describe, expect, it } from 'vitest';
import { appCheckSiteKey } from '../src/config';

describe('App Check switch (APP-24)', () => {
  it('is on in Firebase mode with a site key', () => {
    expect(appCheckSiteKey({ VITE_BACKEND: 'firebase', VITE_RECAPTCHA_SITE_KEY: ' 6Lc-key ' })).toBe('6Lc-key');
  });
  it('is off without a key', () => {
    expect(appCheckSiteKey({ VITE_BACKEND: 'firebase' })).toBeNull();
    expect(appCheckSiteKey({ VITE_BACKEND: 'firebase', VITE_RECAPTCHA_SITE_KEY: '  ' })).toBeNull();
  });
  it('is off in test mode and with the emulators, even with a key', () => {
    expect(appCheckSiteKey({ VITE_BACKEND: 'local', VITE_RECAPTCHA_SITE_KEY: 'k' })).toBeNull();
    expect(appCheckSiteKey({ VITE_BACKEND: 'firebase', VITE_USE_EMULATORS: 'true', VITE_RECAPTCHA_SITE_KEY: 'k' })).toBeNull();
  });
});
