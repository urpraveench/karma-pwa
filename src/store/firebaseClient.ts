import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { appCheckSiteKey, firebaseConfig } from '../config';

// Import this module dynamically, only in firebase mode, so test mode never downloads the SDK.

export const app = initializeApp(firebaseConfig);

// App Check: proves requests come from this app on app.tiktym.com, so Firestore and Auth can refuse anything else
// once enforcement is on in the Firebase console. Must start before Auth and Firestore are used.
const siteKey = appCheckSiteKey();
if (siteKey) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
export const auth = getAuth(app);

// Offline persistence: logging works without signal and syncs later. Shared between copies of the app (SYNC-18): with
// the default single-tab storage, a second tab, or the Android app reopened before the last copy's claim lapsed, ran
// without it, so its changes weren't kept on the device.
let firestore: Firestore;
try { firestore = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch { firestore = getFirestore(app); }
export const db = firestore;

// Local Firebase emulators (firebase.json), used by the browser tests. Never set this for a deploy.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
