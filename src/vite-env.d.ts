/// <reference types="vite/client" />

/** Set at build time by vite.config.ts. */
declare const __BUILD__: { version: string; commit: string; builtAt: string };

interface ImportMetaEnv {
  readonly VITE_BACKEND?: 'local' | 'firebase';
  readonly VITE_SHOW_DEV_HINT?: string;
  readonly VITE_ENABLE_GOOGLE?: string;
  readonly VITE_TERMS_URL?: string;
  readonly VITE_PRIVACY_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** reCAPTCHA Enterprise (Fraud Defense) site key for Firebase App Check; App Check is off without it. */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  /** Android app only: App Check through Play Integrity ('play') or the debug provider ('debug'); off when unset. */
  readonly VITE_ANDROID_APPCHECK?: 'play' | 'debug' | '';
  /** Google Analytics (GA4) measurement ID. Without it the app never asks for consent or loads Analytics. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Browser tests only: talk to the local Auth and Firestore emulators. */
  readonly VITE_USE_EMULATORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set as soon as the app's code runs; read by the start screen in index.html. */
  tiktymStarted?: boolean;
  /** Browser-test seam for AI voice understanding; production Firebase builds ignore it. */
  __TIKTYM_VOICE_AI__?: (input: { blob: Blob; categories: Array<{ id: string; name: string }>; signal?: AbortSignal }) => Promise<unknown>;
}
