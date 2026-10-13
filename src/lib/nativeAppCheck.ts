// App Check inside the Android app (AND-04). reCAPTCHA can't run there, so the web SDK's App Check gets its token from
// Android's own App Check (@capacitor-firebase/app-check): Play Integrity in Play builds, the debug provider in debug builds.
// Pure apart from the plugin it's given, so it's unit-tested (tests/nativeAppCheck.test.ts).

export type NativeAppCheckMode = 'play' | 'debug';

/** Which provider the Android app uses, from VITE_ANDROID_APPCHECK (set by the android:build scripts), or null for none. */
export const nativeAppCheckMode = (v: string | undefined): NativeAppCheckMode | null => (v === 'play' || v === 'debug' ? v : null);

export interface NativeAppCheckPlugin {
  initialize(o: { debugToken: boolean; isTokenAutoRefreshEnabled: boolean }): Promise<void>;
  getToken(o?: { forceRefresh?: boolean }): Promise<{ token: string; expireTimeMillis?: number }>;
}

/**
 * The getToken for the web SDK's CustomProvider: starts Android's App Check once (the plugin can only be started once),
 * then hands over its token. Android always reports when a token expires; if it ever doesn't, the web SDK refreshes after 30 minutes.
 * `load` returns the plugin's module, never the plugin itself: a Capacitor plugin is a proxy, and a promise resolved with it
 * calls a native "then" method that doesn't exist.
 */
export function nativeAppCheckToken(load: () => Promise<{ FirebaseAppCheck: NativeAppCheckPlugin }>, mode: NativeAppCheckMode, now = () => Date.now()) {
  let ready: Promise<{ FirebaseAppCheck: NativeAppCheckPlugin }> | null = null;
  return async () => {
    ready ??= load().then(async m => {
      await m.FirebaseAppCheck.initialize({ debugToken: mode === 'debug', isTokenAutoRefreshEnabled: true });
      return m;
    }).catch(e => { ready = null; throw e; });
    const { token, expireTimeMillis } = await (await ready).FirebaseAppCheck.getToken();
    return { token, expireTimeMillis: expireTimeMillis || now() + 30 * 60_000 };
  };
}
