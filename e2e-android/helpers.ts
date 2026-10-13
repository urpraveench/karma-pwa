import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { _android, expect, type AndroidDevice, type Page } from '@playwright/test';

// Drives TikTym's Android app (the debug build from `npm run android:build:test`) on the first connected emulator.
// The app reaches the Firebase emulators on this computer through `adb reverse`, as 127.0.0.1 inside the phone.

export const PKG = 'com.tiktym.app';
const ADB = `${homedir()}/Library/Android/sdk/platform-tools/adb`;
const APK = 'android/app/build/outputs/apk/debug/app-debug.apk';

export const adb = (...args: string[]) => execFileSync(ADB, args, { encoding: 'utf8' });

/** The emulator, with the test build installed fresh (no data from earlier runs) and the emulator ports forwarded. */
export async function connect(): Promise<AndroidDevice> {
  const [device] = await _android.devices();
  if (!device) throw new Error('No Android emulator running. Start one (emulator -avd Medium_Phone_API_36.0), then run again.');
  adb('install', '-r', APK);
  adb('shell', 'pm', 'clear', PKG);
  for (const port of ['9099', '8080']) adb('reverse', `tcp:${port}`, `tcp:${port}`);
  return device;
}

/** Starts the app from scratch and returns its WebView page. */
export async function launch(device: AndroidDevice): Promise<Page> {
  await device.shell(`am force-stop ${PKG}`);
  await device.shell(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  const webView = await device.webView({ pkg: PKG }, { timeout: 30_000 });
  const page = await webView.page();
  await expect(page.locator('.login h1, .hello, .first-run')).toBeVisible({ timeout: 30_000 });
  return page;
}

/** A new account on the Auth emulator, made directly so the test can sign in with it. */
export async function newAccount(): Promise<{ email: string; password: string; uid: string }> {
  const email = `android${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`, password = 'test-pass-123';
  const res = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`Auth emulator: ${res.status}`);
  return { email, password, uid: (await res.json()).localId };
}

/** Signs in with email on the sign-in screen and starts the account from first run, landing on Today. */
export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.fill('#em', account.email);
  await page.fill('#pw', account.password);
  await page.click('button[type=submit]');
  await expect(page.locator('.hello, .first-run')).toBeVisible({ timeout: 30_000 });
  if (await page.locator('.first-run').count()) await page.locator('.fr-start .btn').click();
  await expect(page.locator('.hello')).toBeVisible({ timeout: 30_000 });
}

/** The account's saved notification devices, read from the Firestore emulator past the rules. */
export async function devices(uid: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-tiktym/databases/(default)/documents/users/${uid}/devices`, { headers: { Authorization: 'Bearer owner' } });
  const docs = ((await res.json()).documents ?? []) as { name: string; fields: Record<string, { stringValue?: string; integerValue?: string }> }[];
  return docs.map(d => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue ?? Number(v.integerValue)])) }));
}
