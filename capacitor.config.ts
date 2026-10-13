import type { CapacitorConfig } from '@capacitor/cli';

// TikTym's Android app: the same React app, bundled from dist-android (built by `npm run android:build`). GTM.md › Strategy.
// TIKTYM_EMULATORS=1 (npm run android:build:test) serves the app over http, so it can reach the local Firebase emulators
// through `adb reverse`; never ship that build.
const emulators = process.env.TIKTYM_EMULATORS === '1';

const config: CapacitorConfig = {
  appId: 'com.tiktym.app',
  appName: 'TikTym',
  webDir: 'dist-android',
  android: { backgroundColor: '#EDF0EA' },
  ...(emulators ? { server: { androidScheme: 'http', cleartext: true } } : {}),
};

export default config;
