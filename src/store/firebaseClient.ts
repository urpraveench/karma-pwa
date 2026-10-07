import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../config';

// Import this module dynamically, only in firebase mode, so test mode never downloads the SDK.

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline persistence: logging works without signal and syncs later.
let firestore: Firestore;
try { firestore = initializeFirestore(app, { localCache: persistentLocalCache() }); }
catch { firestore = getFirestore(app); }
export const db = firestore;

// Local Firebase emulators (firebase.json), used by the browser tests. Never set this for a deploy.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
