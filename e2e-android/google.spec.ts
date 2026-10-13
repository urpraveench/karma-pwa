import { expect, test, type AndroidDevice, type Page } from '@playwright/test';
import { connect, launch, PKG } from './helpers';

// Google sign-in in the Android app (AND-03): Android's own account picker gets a Google ID token, and the app's Firebase
// Auth signs in with it. The emulator has no Google account, so the success and cancel tests answer the picker at the
// Capacitor bridge; the Auth emulator accepts an unsigned token, as it does for Google sign-in on the web.

let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.beforeEach(async () => { await device.shell(`pm clear ${PKG}`); }); // each test starts signed out
test.afterAll(async () => { await device?.close(); });

/** Makes the native signInWithGoogle call resolve with `idToken`, or reject with `error`. Other native calls go through. */
async function answerPicker(page: Page, answer: { idToken: string } | { error: string }) {
  await page.evaluate(a => {
    const cap = (window as unknown as { Capacitor: { nativePromise: (p: string, m: string, o: unknown) => Promise<unknown> } }).Capacitor;
    const real = cap.nativePromise.bind(cap);
    cap.nativePromise = (plugin, method, options) => {
      if (plugin !== 'FirebaseAuthentication' || method !== 'signInWithGoogle') return real(plugin, method, options);
      (window as unknown as { pickerOptions: unknown }).pickerOptions = options;
      return 'error' in a ? Promise.reject(new Error(a.error)) : Promise.resolve({ user: null, credential: { providerId: 'google.com', idToken: a.idToken } });
    };
  }, answer);
}

test('Continue with Google signs in with the account Android picks (AND-03)', async () => {
  const email = `google${Date.now()}@example.com`;
  const page = await launch(device);
  await answerPicker(page, { idToken: JSON.stringify({ sub: `g-${Date.now()}`, email, email_verified: true, name: 'Asha Rao' }) });
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.locator('.hello, .first-run')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { pickerOptions: unknown }).pickerOptions)).toEqual({ skipNativeAuth: true });
  expect(new URL(page.url()).hostname).toBe('localhost'); // never left the app for a Google web page
});

test('closing the picker leaves the sign-in screen as it was, with no message (AND-03)', async () => {
  const page = await launch(device);
  await answerPicker(page, { error: 'activity is cancelled by the user.' });
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(page.locator('.login h1')).toHaveText('TikTym');
});

test('the real button opens Google\'s own Android screen, and Back returns to sign-in (AND-03)', async () => {
  const page = await launch(device);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  // Google Play services takes over the screen (the emulator has no account, so Google offers to add one)
  await expect.poll(async () => (await device.shell('dumpsys activity activities')).toString().match(/topResumedActivity=.*? (\S+)\//)?.[1],
    { timeout: 30_000 }).toBe('com.google.android.gms');
  await expect.poll(async () => {
    await device.shell('input keyevent KEYCODE_BACK');
    await new Promise(r => setTimeout(r, 1500));
    return (await device.shell('dumpsys activity activities')).toString().match(/topResumedActivity=.*? (\S+)\//)?.[1];
  }, { timeout: 30_000 }).toBe('com.tiktym.app');
  await expect(page.locator('.login h1')).toHaveText('TikTym');
  await page.waitForTimeout(1500);
  await expect(page.getByText('Google sign-in failed')).toHaveCount(0);
});
