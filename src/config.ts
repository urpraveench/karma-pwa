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
  /** Where feedback and support requests go (also on the Terms and Privacy pages). */
  supportEmail: 'praveen.cherukuru@gmail.com',
  linkedin: 'https://www.linkedin.com/company/tiktym/',
  instagram: 'https://www.instagram.com/tiktym.app/',
  whatsNew: 'https://tiktym.com/updates/',
  /** The app's own Terms and Privacy pages (public/terms, public/privacy), unless .env.local points elsewhere. */
  legal: { terms: env.VITE_TERMS_URL || '/terms/', privacy: env.VITE_PRIVACY_URL || '/privacy/' },
};

export const FIREBASE_READY = config.backend === 'firebase' && !!(firebaseConfig.apiKey && firebaseConfig.projectId);

/**
 * The reCAPTCHA Enterprise (Google Cloud Fraud Defense) site key for Firebase App Check, or null when App Check should stay off:
 * no key configured, test mode, or the local emulators (which don't check App Check tokens).
 */
export function appCheckSiteKey(e: { VITE_BACKEND?: string; VITE_USE_EMULATORS?: string; VITE_RECAPTCHA_SITE_KEY?: string } = env): string | null {
  if (e.VITE_BACKEND !== 'firebase' || e.VITE_USE_EMULATORS === 'true') return null;
  return e.VITE_RECAPTCHA_SITE_KEY?.trim() || null;
}

/** A mailto: link for feedback, with the version and build filled in so every report says which build it's about. */
export function feedbackLink(build: { version: string; commit: string }, email = config.supportEmail): string {
  const subject = `TikTym feedback (${build.version})`;
  const body = `\n\n---\nTikTym ${build.version}, build ${build.commit}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
