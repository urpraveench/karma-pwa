import type { Page } from '@playwright/test';
import { DEMO, expect, open, seedData, signInWith, tab, test, toast } from './helpers';

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
const reminderRow = (page: Page) => page.locator('.li', { hasText: 'Daily reminder' });
const DATA = seedData([{ id: 'ex', name: 'Exercise' }, { id: 'rd', name: 'Reading' }]);
const asked = (page: Page) => page.evaluate(() => (window as unknown as { __push: { asked: number } }).__push.asked);

test('on by default: the first tap anywhere asks the phone, and the 7 pm reminder is set, with no screen of our own (NOTIF-12)', async ({ page }) => {
  await fakePush(page);
  await signInWith(page, DATA);
  await expect(page.locator('.install-card[aria-label="Daily reminder"]')).toHaveCount(0); // no card
  expect(await asked(page)).toBe(0); // browsers only allow asking from a tap
  await tab(page, 'Insights').click();
  await expect(toast(page)).toHaveText("Reminder set for 7 pm, if anything's left");
  expect(await page.evaluate(() => (window as unknown as { __push: { asked: number; key: number } }).__push)).toEqual({ asked: 1, key: 65 }); // TikTym's public key, 65 bytes
  const s = await saved(page);
  expect(s.settings.reminder).toEqual({ on: true, time: '19:00', tz: expect.stringMatching(/^Asia\/(Kolkata|Calcutta)$/) }); // Chrome may use the older name
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
  await page.reload(); // allowed already: never asks again
  await tab(page, 'Insights').click();
  expect(await asked(page)).toBe(0);
});

test('a new account: the first tap on the first-run screen asks (NOTIF-12, FIRST-13)', async ({ page }) => {
  await fakePush(page);
  await open(page);
  await page.fill('#em', DEMO.email); await page.fill('#pw', DEMO.password); await page.click('button[type=submit]');
  await expect(page.locator('.first-run')).toBeVisible();
  await page.locator('.fr-start .btn').click();
  await expect(page.locator('.hello')).toBeVisible();
  await expect(toast(page)).toHaveText("Reminder set for 7 pm, if anything's left");
  expect(await asked(page)).toBe(1);
});

test('Setup shows both on by default, before the phone has answered (NOTIF-12, NOTIF-18)', async ({ page }) => {
  await fakePush(page, 'default');
  await signInWith(page, DATA);
  await tab(page, 'Setup').click();
  await expect(reminderRow(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(reminderRow(page)).toContainText("Push · at 7 pm, only if something's left that day");
  await expect(page.locator('.li', { hasText: 'Evening log check' })).toHaveAttribute('aria-pressed', 'true');
});

test('switched off in Setup: a tap never asks (NOTIF-12)', async ({ page }) => {
  await fakePush(page);
  await signInWith(page, seedData([{ id: 'ex', name: 'Exercise' }], [], { reminder: { on: false } }));
  await tab(page, 'Insights').click();
  await tab(page, 'Today').click();
  expect(await asked(page)).toBe(0);
});

test('refused on the phone: says where to allow them, and Setup explains (NOTIF-12)', async ({ page }) => {
  await fakePush(page, 'denied');
  await signInWith(page, DATA);
  await tab(page, 'Insights').click();
  await expect(toast(page)).toHaveText('Notifications are blocked. Allow them for TikTym in your browser settings.');
  await tab(page, 'Setup').click();
  await expect(reminderRow(page)).toContainText('Notifications are blocked for TikTym');
  await expect(reminderRow(page)).toBeDisabled();
});

test('the 8 pm evening log check: on by default, and switched off on its own (NOTIF-18)', async ({ page }) => {
  await fakePush(page);
  await signInWith(page, DATA);
  await tab(page, 'Setup').click(); // the tap asks, and the phone allows
  const nudge = page.locator('.li', { hasText: 'Evening log check' });
  await expect(nudge).toContainText("Push · at 8 pm, only if nothing's logged that day");
  await expect(nudge).toHaveAttribute('aria-pressed', 'true');
  expect((await saved(page)).settings.logNudge).toBeUndefined(); // on by default, nothing stored
  await nudge.click();
  await expect(nudge).toHaveAttribute('aria-pressed', 'false');
  expect((await saved(page)).settings.logNudge).toBe(false);
  await expect(reminderRow(page)).toHaveAttribute('aria-pressed', 'true'); // the daily reminder is separate
});

test.describe('Safari on an iPhone, not from the home screen', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  test('Setup says reminders need TikTym on the home screen, and Today never offers them (NOTIF-12)', async ({ page }) => {
    await fakePush(page, 'granted', { noPush: true });
    await page.addInitScript(() => localStorage.setItem('tiktym:install-nudge', '{"dismissals":2}'));
    await signInWith(page, DATA);
    await tab(page, 'Setup').click();
    await expect(reminderRow(page)).toContainText('reminders work once TikTym is on your home screen');
    await expect(reminderRow(page)).toBeDisabled();
  });
});

test("a practice's own reminder: picked on its sheet, saved with the time zone, shown in Setup, and turned off (PRAC-24)", async ({ page }) => {
  await fakePush(page, 'granted', { permission: 'granted' });
  await signInWith(page, DATA);
  await tab(page, 'Setup').click();
  await page.locator('.li-prac', { hasText: 'Reading' }).locator('.li-open').click();
  await expect(page.getByLabel('Remind me')).toHaveValue(''); // off to start
  await page.getByLabel('Remind me').selectOption('10:00');
  await expect(page.locator('.sheet')).toContainText("A push at 10 am, only if it's still to do that day.");
  await page.click('.sheet button[type=submit]');
  await expect(toast(page)).toHaveText('Saved changes');
  await expect(page.locator('.li-prac', { hasText: 'Reading' })).toContainText('reminder at 10 am');
  await expect(page.locator('.li-prac', { hasText: 'Exercise' })).not.toContainText('reminder');
  const read = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('tiktym:data:'))!;
    return JSON.parse(localStorage.getItem(key)!) as { categories: { id: string; remind?: string }[]; settings: { reminder?: { tz?: string } } };
  });
  let d = await read();
  expect(d.categories.find(c => c.id === 'rd')?.remind).toBe('10:00');
  expect(d.settings.reminder?.tz).toMatch(/^Asia\/(Kolkata|Calcutta)$/);

  await page.locator('.li-prac', { hasText: 'Reading' }).locator('.li-open').click();
  await expect(page.getByLabel('Remind me')).toHaveValue('10:00');
  await page.getByLabel('Remind me').selectOption('');
  await page.click('.sheet button[type=submit]');
  await expect(page.locator('.li-prac', { hasText: 'Reading' })).not.toContainText('reminder');
  d = await read();
  expect(d.categories.find(c => c.id === 'rd')?.remind).toBeUndefined();
});

test.describe("a practice's reminder on an iPhone outside the home-screen app", () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  test('the sheet says why it can\'t come yet (PRAC-24)', async ({ page }) => {
    await fakePush(page, 'granted', { noPush: true });
    await signInWith(page, DATA);
    await tab(page, 'Setup').click();
    await page.locator('.li-prac', { hasText: 'Exercise' }).locator('.li-open').click();
    await page.getByLabel('Remind me').selectOption('18:00');
    await expect(page.locator('.sheet')).toContainText('On iPhone, reminders work once TikTym is on your home screen.');
  });
});
