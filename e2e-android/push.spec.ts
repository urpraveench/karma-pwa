import { createHash } from 'node:crypto';
import { expect, test, type AndroidDevice, type Page } from '@playwright/test';
import { connect, devices, launch, newAccount, PKG, signIn } from './helpers';

// Notifications in the Android app (AND-05): the first tap asks Android, and Allow saves the app's FCM token as a device
// in the account, which the server sends to (AND-08). Two tests answer Android at the Capacitor bridge, so they choose
// the answer; the last one uses the real plugin, with Google Play services on the emulator handing out a real FCM token.

let device: AndroidDevice;
test.beforeAll(async () => { device = await connect(); });
test.beforeEach(async () => { await device.shell(`pm clear ${PKG}`); }); // signed out, and Android's answer forgotten
test.afterAll(async () => { await device?.close(); });

const tab = (page: Page, name: string) => page.locator('.tab', { hasText: name });
const toast = (page: Page) => page.locator('.toast span').first();
const idOf = (token: string) => createHash('sha256').update(token).digest('hex').slice(0, 24);

/** Answers the PushNotifications plugin: Android's permission says `permission` until asked, then `answer`; register hands out `token`. */
async function answerAndroid(page: Page, o: { permission: string; answer: string; token: string }) {
  await page.evaluate(o => {
    type Cap = { nativePromise: (p: string, m: string, x: unknown) => Promise<unknown>; nativeCallback: (p: string, m: string, x: unknown, cb: (d: unknown) => void) => string };
    const cap = (window as unknown as { Capacitor: Cap }).Capacitor;
    const w = window as unknown as { pushCalls: unknown[] };
    const realPromise = cap.nativePromise.bind(cap), realCallback = cap.nativeCallback.bind(cap);
    const listeners = new Map<string, (d: unknown) => void>();
    let permission = o.permission, n = 0;
    w.pushCalls = [];
    cap.nativeCallback = (plugin, method, options, cb) => {
      if (plugin !== 'PushNotifications') return realCallback(plugin, method, options, cb);
      if (method === 'addListener') listeners.set((options as { eventName: string }).eventName, cb);
      return `push-${++n}`;
    };
    cap.nativePromise = (plugin, method, options) => {
      if (plugin !== 'PushNotifications') return realPromise(plugin, method, options);
      w.pushCalls.push([method, options]);
      if (method === 'checkPermissions') return Promise.resolve({ receive: permission });
      if (method === 'requestPermissions') { permission = o.answer; return Promise.resolve({ receive: permission }); }
      if (method === 'register') setTimeout(() => listeners.get('registration')?.({ value: o.token }), 50);
      return Promise.resolve();
    };
  }, o);
}

test('the first tap asks Android, and Allow saves the app\'s FCM token as a device, in a Reminders channel (AND-05)', async () => {
  const account = await newAccount(), token = `fcm-${Date.now()}`;
  const page = await launch(device);
  await answerAndroid(page, { permission: 'prompt', answer: 'granted', token });
  await signIn(page, account); // the first-run Start tap is the first tap
  await expect(toast(page)).toHaveText("Reminder set for 7 pm, if anything's left", { timeout: 15_000 });
  await expect.poll(() => devices(account.uid)).toEqual([expect.objectContaining({ id: idOf(token), fcm: token, platform: 'android' })]);
  const calls = await page.evaluate(() => (window as unknown as { pushCalls: [string, unknown][] }).pushCalls);
  expect(calls.filter(([m]) => m === 'requestPermissions')).toHaveLength(1);
  expect(calls).toContainEqual(['createChannel', expect.objectContaining({ id: 'reminders', name: 'Reminders' })]);

  await tab(page, 'Setup').click();
  await expect(page.locator('.li', { hasText: 'Daily reminder' })).toContainText("Push · at 7 pm, only if something's left that day");
});

test('refused: says to turn them on in Android\'s settings, and Setup explains (AND-05)', async () => {
  const account = await newAccount();
  const page = await launch(device);
  await answerAndroid(page, { permission: 'prompt', answer: 'denied', token: 'never' });
  await signIn(page, account);
  await expect(toast(page)).toHaveText('Notifications are off. Turn them on in Android Settings › Apps › TikTym › Notifications.', { timeout: 15_000 });
  await tab(page, 'Setup').click();
  const row = page.locator('.li', { hasText: 'Daily reminder' });
  await expect(row).toContainText('Turn them on in Android Settings › Apps › TikTym › Notifications');
  await expect(row).toBeDisabled();
  expect(await devices(account.uid)).toEqual([]);
});

test('with the real plugin, Android hands the app an FCM token and it\'s saved (AND-05)', async () => {
  const account = await newAccount();
  await device.shell(`pm grant ${PKG} android.permission.POST_NOTIFICATIONS`); // stands in for tapping Allow on Android's dialog
  const page = await launch(device);
  await signIn(page, account);
  await expect(toast(page)).toHaveText("Reminder set for 7 pm, if anything's left", { timeout: 30_000 });
  const [saved] = await devices(account.uid);
  expect(saved).toMatchObject({ platform: 'android' });
  expect(String(saved.fcm)).toMatch(/^[\w-]+:[\w-]{100,}$/); // FCM's token format: an instance id, a colon, then the token
  expect(saved.id).toBe(idOf(String(saved.fcm)));
  // The channel the server sends into, made by the app, as Android's settings will list it
  expect((await device.shell('dumpsys notification --noredact')).toString()).toContain("NotificationChannel{mId='reminders', mName=Reminders,");
});
