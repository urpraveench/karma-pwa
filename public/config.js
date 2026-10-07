// Karma — runtime configuration.
// Firebase *web* config values are not secrets: they identify your project.
// Real protection comes from Firestore rules (firestore.rules) + Firebase Auth.
window.KARMA_CONFIG = {
  // 'local'    = test mode. Data stays in this browser; login uses devCredentials.
  // 'firebase' = Firestore + Firebase Auth. Fill in `firebase` below first.
  mode: 'local',

  // Temporary login for test mode only. This is a UI gate, not security.
  devCredentials: { email: 'demo@karma.local', password: 'karma123' },
  showDevHint: true, // shows the test login on the sign-in screen

  // TODO(Praveen): set to true after enabling the Google provider in
  // Firebase Console > Authentication > Sign-in method.
  enableGoogle: false,

  // TODO(Praveen): required before public launch (shown on the sign-up screen).
  legal: null, // e.g. { terms: '/terms.html', privacy: '/privacy.html' }

  // TODO(Praveen): paste from Firebase Console > Project settings > Your apps > Web app.
  // Tip: set authDomain to your hosting domain (e.g. your-project.web.app) so Google
  // sign-in works reliably when the app is installed on iPhone.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
