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
  /** Browser tests only: talk to the local Auth and Firestore emulators. */
  readonly VITE_USE_EMULATORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
