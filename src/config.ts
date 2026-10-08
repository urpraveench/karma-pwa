// Runtime configuration from Vite env vars (see .env.example).
// Firebase *web* config values are not secrets: they identify your project.
// Real protection comes from Firestore rules (firestore.rules) + Firebase Auth.

const env = import.meta.env;
const flag = (v: string | undefined, fallback: boolean) => v === undefined || v === '' ? fallback : v === 'true';

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

export const config = {
  /** 'local' = test mode: data stays in this browser and login uses devCredentials. */
  backend: (env.VITE_BACKEND === 'firebase' ? 'firebase' : 'local') as 'local' | 'firebase',
  /** Temporary login for test mode only. This is a UI gate, not security. */
  devCredentials: { email: 'demo@tiktym.local', password: 'tiktym123' },
  showDevHint: flag(env.VITE_SHOW_DEV_HINT, true),
  enableGoogle: flag(env.VITE_ENABLE_GOOGLE, false),
  legal: env.VITE_TERMS_URL && env.VITE_PRIVACY_URL ? { terms: env.VITE_TERMS_URL, privacy: env.VITE_PRIVACY_URL } : null,
};

export const FIREBASE_READY = config.backend === 'firebase' && !!(firebaseConfig.apiKey && firebaseConfig.projectId);

/**
 * The reCAPTCHA v3 site key for Firebase App Check, or null when App Check should stay off:
 * no key configured, test mode, or the local emulators (which don't check App Check tokens).
 */
export function appCheckSiteKey(e: { VITE_BACKEND?: string; VITE_USE_EMULATORS?: string; VITE_RECAPTCHA_SITE_KEY?: string } = env): string | null {
  if (e.VITE_BACKEND !== 'firebase' || e.VITE_USE_EMULATORS === 'true') return null;
  return e.VITE_RECAPTCHA_SITE_KEY?.trim() || null;
}
