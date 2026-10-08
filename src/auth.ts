import { config, FIREBASE_READY } from './config';
import { LocalStore } from './store/local';
import type { Store } from './store/types';
import type { User } from './lib/types';

// Sign-in for both modes behind one interface. Each method resolves to an error message, or null on success.
// A successful sign-in reaches the app through `signedIn`, the same path as a restored session.

export interface AuthApi {
  firebase: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  resetPassword(email: string): Promise<string | null>;
  /** Resolves to a message to show as a toast, or null. */
  google(): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface AuthCallbacks {
  signedIn(user: User, store: Store): void;
  signedOut(): void;
  onSaveError(): void;
}

const AUTH_ERR: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don\'t match.', 'auth/wrong-password': 'That email and password don\'t match.', 'auth/user-not-found': 'That email and password don\'t match.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.', 'auth/weak-password': 'Use at least 6 characters.',
  'auth/invalid-email': 'That doesn\'t look like an email address.', 'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.', 'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
};
export const errCode = (e: unknown) => (e as { code?: string })?.code || (e as Error)?.message || String(e);
export const authMsg = (e: unknown) => AUTH_ERR[(e as { code?: string })?.code || ''] || 'Something went wrong: ' + errCode(e);

/**
 * Running from an iPhone or iPad home screen (iOS sets `navigator.standalone`). There, a sign-in pop-up opens in
 * Safari, whose storage the installed app can't see, so the result never comes back; a full-page redirect stays
 * in the app. This relies on the auth domain being the app's own domain and on the service worker leaving `/__/` alone.
 */
const isIOSHomeScreenApp = () => (navigator as Navigator & { standalone?: boolean }).standalone === true;

const SESSION_KEY = 'tiktym:session';
const GOOGLE_NOT_SET_UP = 'Google sign-in isn\'t set up yet. Add the Firebase keys to .env.local and set VITE_ENABLE_GOOGLE=true.';

export async function startAuth(cb: AuthCallbacks): Promise<AuthApi> {
  return FIREBASE_READY ? startFirebaseAuth(cb) : startLocalAuth(cb);
}

function startLocalAuth(cb: AuthCallbacks): AuthApi {
  const open = (u: User) => cb.signedIn(u, LocalStore(u.id, cb.onSaveError));
  let s: User | null = null;
  try { s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { /* corrupt session */ }
  if (s) open(s); else cb.signedOut();
  const dc = config.devCredentials;
  return {
    firebase: false,
    async signIn(email, password) {
      if (email.toLowerCase() !== dc.email.toLowerCase() || password !== dc.password) return 'That email and password don\'t match the test login.';
      const u: User = { id: 'local-' + dc.email.toLowerCase(), email: dc.email, name: 'Test user' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      open(u);
      return null;
    },
    signUp: async () => 'Sign-up needs Firebase. Use the test login.',
    resetPassword: async () => 'Password reset needs Firebase.',
    google: async () => GOOGLE_NOT_SET_UP,
    async signOut() { localStorage.removeItem(SESSION_KEY); cb.signedOut(); },
  };
}

async function startFirebaseAuth(cb: AuthCallbacks): Promise<AuthApi> {
  const [{ auth, db }, A, { FirebaseStore }] = await Promise.all([import('./store/firebaseClient'), import('firebase/auth'), import('./store/firebase')]);
  A.getRedirectResult(auth).catch(e => console.warn(e));
  A.onAuthStateChanged(auth, u => u ? cb.signedIn({ id: u.uid, email: u.email, name: u.displayName }, FirebaseStore(db, auth, u.uid)) : cb.signedOut());
  const attempt = async (fn: () => Promise<unknown>) => { try { await fn(); return null; } catch (e) { return authMsg(e); } };
  return {
    firebase: true,
    signIn: (email, pw) => attempt(() => A.signInWithEmailAndPassword(auth, email, pw)),
    signUp: (email, pw) => attempt(() => A.createUserWithEmailAndPassword(auth, email, pw)),
    resetPassword: email => attempt(() => A.sendPasswordResetEmail(auth, email)),
    async google() {
      if (!config.enableGoogle) return GOOGLE_NOT_SET_UP;
      const p = new A.GoogleAuthProvider();
      if (isIOSHomeScreenApp()) { await A.signInWithRedirect(auth, p); return null; }
      try { await A.signInWithPopup(auth, p); return null; }
      catch (e) {
        if (/popup/.test((e as { code?: string }).code || '')) { await A.signInWithRedirect(auth, p); return null; }
        return 'Google sign-in failed: ' + errCode(e);
      }
    },
    signOut: () => A.signOut(auth),
  };
}
