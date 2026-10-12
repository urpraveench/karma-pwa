import { test as base, expect, type Page } from '@playwright/test';

/** Wednesday 7 October 2026, 10:00: clear of the month-start, month-end, Monday and weekend moments. */
export const NOW = new Date(2026, 9, 7, 10, 0);
export const at = (h: number, m = 0, day = 7) => new Date(2026, 9, day, h, m);

export const DEMO = { email: 'demo@tiktym.local', password: 'tiktym123' };
const SESSION = { id: 'local-demo@tiktym.local', email: DEMO.email, name: 'Test user' };

/** Every test-mode test fails if the app logs a console error or warning (APP-19). */
export const test = base.extend<{ consoleErrors: string[]; installCard: boolean; hideInstallCard: void; reminderCard: boolean; hideReminderCard: void; ideaSplash: boolean; hideIdeaSplash: void }>({
  /** The install card on Today (APP-30) would appear in most tests (they run as an Android phone and log minutes); off unless a test opts in. */
  installCard: [false, { option: true }],
  hideInstallCard: [async ({ page, installCard }, use) => {
    if (!installCard) await page.addInitScript(() => localStorage.setItem('tiktym:install-nudge', '{"dismissals":2}'));
    await use();
  }, { auto: true }],
  /** The first tap in the app asks the phone for notifications (NOTIF-12): answered as if closed, unless a test opts in. */
  reminderCard: [false, { option: true }],
  hideReminderCard: [async ({ page, reminderCard }, use) => {
    if (!reminderCard) await page.addInitScript(() => { Notification.requestPermission = async () => 'default'; });
    await use();
  }, { auto: true }],
  /** And the once-a-day splash with today's idea (TODAY-21), which would cover Today on every test's first open. */
  ideaSplash: [false, { option: true }],
  hideIdeaSplash: [async ({ page, ideaSplash }, use) => {
    if (!ideaSplash) await page.addInitScript(() => localStorage.setItem('tiktym:idea-seen', '9999-12-31'));
    await use();
  }, { auto: true }],
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', m => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      if (m.text().includes('blocked by Playwright')) return; // our own serviceWorkers: 'block', not the app
      errors.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await use(errors);
    expect(errors, 'console errors or warnings').toEqual([]);
  }, { auto: true }],
});
export { expect };

/** Fixes the clock, accepts confirm()/prompt() dialogs, and opens the login screen. */
export async function open(page: Page, time = NOW) {
  await page.clock.install({ time });
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'DELETE' : undefined));
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym');
}

export async function signIn(page: Page, time = NOW) {
  await open(page, time);
  await page.fill('#em', DEMO.email);
  await page.fill('#pw', DEMO.password);
  await page.click('button[type=submit]');
  await startWithDefaults(page);
}

/** A brand-new account: takes the practices ticked on first run (FIRST-01), then waits for Today. */
export async function startWithDefaults(page: Page, opts: { timeout?: number } = {}) {
  await expect(page.locator('.hello, .first-run')).toBeVisible(opts);
  if (await page.locator('.first-run').count()) await page.locator('.fr-start .btn').click();
  await expect(page.locator('.hello')).toBeVisible(opts);
}

// --- seeded data, for scenarios that need history ---

type Cat = { id: string; name: string; minutes?: number; days?: number[]; start?: string; color?: string; archivedFrom?: string | null };
type Log = [catId: string, date: string, minutes: number];
const COLORS = ['#1F8A70', '#3E5BA9', '#A0740A', '#8A4FA3'];

export function seedData(cats: Cat[], logs: Log[] = [], settings: Record<string, unknown> = {}) {
  return {
    categories: cats.map((c, i) => ({
      id: c.id, name: c.name, color: c.color ?? COLORS[i % 4], order: i, startDate: c.start ?? '2026-10-07', archivedFrom: c.archivedFrom ?? null,
      targets: [{ from: c.start ?? '2026-10-07', minutes: c.minutes ?? 30, days: c.days ?? [0, 1, 2, 3, 4, 5, 6] }],
    })),
    logs: logs.map(([catId, date, minutes], i) => ({ id: `seed${i}`, catId, date, minutes, note: '', createdAt: 0 })),
    settings: { seeded: true, ...settings },
  };
}

/** Every date from `from` to `to`, inclusive. */
export function days(from: string, to: string) {
  const out: string[] = [];
  for (let d = new Date(from + 'T12:00'); d <= new Date(to + 'T12:00'); d.setDate(d.getDate() + 1))
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  return out;
}

/** Signs in to a test-mode account that already holds `data`. */
export async function signInWith(page: Page, data: ReturnType<typeof seedData>, time = NOW) {
  await open(page, time);
  await page.evaluate(([s, d]) => {
    localStorage.setItem('tiktym:session', JSON.stringify(s));
    localStorage.setItem('tiktym:data:' + s.id, JSON.stringify(d));
  }, [SESSION, data] as const);
  await page.reload();
  await expect(page.locator('.hello')).toBeVisible();
}

export const toast = (page: Page) => page.locator('.toast span').first();
export const tab = (page: Page, name: string) => page.locator('.tab', { hasText: name });

/** Replaces the default accept-everything dialog handler. */
export function onDialog(page: Page, answer: 'accept' | 'dismiss') {
  page.removeAllListeners('dialog');
  page.on('dialog', d => answer === 'accept' ? d.accept() : d.dismiss());
}

export async function loadSampleData(page: Page) {
  await tab(page, 'Setup').click();
  await page.locator('.li', { hasText: 'Load sample data' }).click();
  await expect(toast(page)).toHaveText('Sample data loaded');
}
