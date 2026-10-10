import type { Page } from '@playwright/test';
import { expect, seedData, signInWith, tab, test, toast } from './helpers';

// Daily reminders in the app (NOTIF-12). The browser's push service can't run here, so the notification permission
// and the service worker's push subscription are stood in for; everything TikTym does around them is real.
test.use({ reminderCard: true });

type Answer = 'granted' | 'denied' | 'default';
async function fakePush(page: Page, answer: Answer = 'granted', opts: { permission?: Answer; noPush?: boolean } = {}) {
  await page.addInitScript(([answer, opts]) => {
    const w = window as unknown as Record<string, unknown>;
    if (opts.noPush) { delete w.PushManager; return; } // Safari on iPhone outside the home-screen app
    const log = { asked: 0, key: null as unknown };
    w.__push = log;
    let permission = opts.permission ?? 'default';
    Object.defineProperty(Notification, 'permission', { get: () => permission, configurable: true });
    Notification.requestPermission = async () => { log.asked++; permission = answer; return answer; };
    const endpoint = 'https://push.example/device-1';
    const sub = { endpoint, toJSON: () => ({ endpoint, keys: { p256dh: 'p256', auth: 'auth' } }) };
    let current: typeof sub | null = null;
    const reg = { pushManager: { getSubscription: async () => current, subscribe: async (o: { applicationServerKey: Uint8Array }) => { log.key = o.applicationServerKey.length; current = sub; return sub; } } };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), register: () => new Promise(() => {}), getRegistration: async () => reg, addEventListener() {}, removeEventListener() {}, controller: null } });
  }, [answer, opts] as const);
}

const saved = (page: Page) => page.evaluate(() => {
  const key = Object.keys(localStorage).find(k => k.startsWith('tiktym:data:'))!;
  const dev = Object.keys(localStorage).find(k => k.startsWith('tiktym:devices:'));
  return { settings: JSON.parse(localStorage.getItem(key)!).settings, devices: dev ? JSON.parse(localStorage.getItem(dev)!) : null };
});
const card = (page: Page) => page.locator('.install-card[aria-label="Daily reminder"]');
const reminderRow = (page: Page) => page.locator('.li', { hasText: 'Daily reminder' });
const DATA = seedData([{ id: 'ex', name: 'Exercise' }, { id: 'rd', name: 'Reading' }]);
const logExercise = (page: Page) => page.getByRole('button', { name: 'Log 30 minutes of Exercise' }).click();

test('never on first open; after the first entry today, "Remind me" asks, saves this device and the time (NOTIF-12)', async ({ page }) => {
  await fakePush(page);
  await signInWith(page, DATA);
  await expect(page.locator('.cat').first()).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __push: { asked: number } }).__push.asked)).toBe(0);

  await logExercise(page);
  await expect(card(page)).toContainText('A notification at 10 am, only if something\'s still left that day.');
  await card(page).getByRole('button', { name: 'Remind me at 10 am' }).click();
  await expect(toast(page)).toHaveText("Reminder set for 10 am, if anything's left");
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __push: { asked: number; key: number } }).__push)).toEqual({ asked: 1, key: 65 }); // TikTym's public key, 65 bytes

  const s = await saved(page);
  expect(s.settings.reminder).toEqual({ on: true, time: '10:00', tz: expect.stringMatching(/^Asia\/(Kolkata|Calcutta)$/) }); // Chrome may use the older name
  expect(Object.values(s.devices)).toEqual([expect.objectContaining({ endpoint: 'https://push.example/device-1', keys: { p256dh: 'p256', auth: 'auth' } })]);

  await tab(page, 'Setup').click();
  await expect(reminderRow(page)).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Reminder time').selectOption('19:30');
  await expect(reminderRow(page)).toContainText('at 7:30 pm');
  expect((await saved(page)).settings.reminder).toMatchObject({ on: true, time: '19:30' });
  await reminderRow(page).click();
  await expect(reminderRow(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Reminder time')).toHaveCount(0);
  expect((await saved(page)).settings.reminder.on).toBe(false);
});

test('"Not now" puts the card away for good (NOTIF-12)', async ({ page }) => {
  await fakePush(page);
  await signInWith(page, DATA);
  await logExercise(page);
  await card(page).getByRole('button', { name: 'Not now' }).last().click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.cat').first()).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test('refused in the browser: says where to allow them, and Setup explains (NOTIF-12)', async ({ page }) => {
  await fakePush(page, 'denied');
  await signInWith(page, DATA);
  await logExercise(page);
  await card(page).getByRole('button', { name: /Remind me at/ }).click();
  await expect(toast(page)).toHaveText('Notifications are blocked. Allow them for TikTym in your browser settings.');
  await expect(card(page)).toHaveCount(0);
  await tab(page, 'Setup').click();
  await expect(reminderRow(page)).toContainText('Notifications are blocked for TikTym');
  await expect(reminderRow(page)).toBeDisabled();
});

test('turned on from Setup, at 7 pm until a time is picked (NOTIF-12)', async ({ page }) => {
  await fakePush(page);
  await signInWith(page, DATA);
  await tab(page, 'Setup').click();
  await expect(reminderRow(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(reminderRow(page)).toContainText("Push · at 7 pm, only if something's left that day");
  await reminderRow(page).click();
  await expect(reminderRow(page)).toHaveAttribute('aria-pressed', 'true');
  expect((await saved(page)).settings.reminder).toMatchObject({ on: true, time: '19:00' });
});

test.describe('Safari on an iPhone, not from the home screen', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  test('Setup says reminders need TikTym on the home screen, and Today never offers them (NOTIF-12)', async ({ page }) => {
    await fakePush(page, 'granted', { noPush: true });
    await page.addInitScript(() => localStorage.setItem('tiktym:install-nudge', '{"dismissals":2}'));
    await signInWith(page, DATA);
    await logExercise(page);
    await expect(card(page)).toHaveCount(0);
    await tab(page, 'Setup').click();
    await expect(reminderRow(page)).toContainText('reminders work once TikTym is on your home screen');
    await expect(reminderRow(page)).toBeDisabled();
  });
});
