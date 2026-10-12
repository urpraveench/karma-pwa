import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { appCheckSiteKey, firebaseConfig } from '../config';

// The admin console's Firebase: Auth for Google sign-in, and the admin Cloud Functions (asia-south1) for everything
// else. It never reads Firestore itself; the rules keep the admin data closed to every app (ADMIN-03).

export const app = initializeApp(firebaseConfig);
const siteKey = appCheckSiteKey();
if (siteKey) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
export const auth = getAuth(app);
export const functions = getFunctions(app, 'asia-south1');

// Local emulators, for the browser tests. Never set this for a deploy.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
