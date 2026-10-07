import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../config';

// Import this module dynamically, only in firebase mode, so test mode never downloads the SDK.

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline persistence: logging works without signal and syncs later.
let firestore: Firestore;
try { firestore = initializeFirestore(app, { localCache: persistentLocalCache() }); }
catch { firestore = getFirestore(app); }
export const db = firestore;
