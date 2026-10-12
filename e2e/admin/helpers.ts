import { expect, type Page } from '@playwright/test';

// The admin console's browser tests run against the Auth emulator, whose Google page stands in for Google. The
// `admin` claim is set the way `npm run admin:grant` sets it, through the Admin API (here the emulator's, with its
// owner token). Cloud Functions aren't emulated: each test answers the ones it uses with stubFunction.

const AUTH_API = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-tiktym';
const OWNER = { Authorization: 'Bearer owner' };
export const POPUP = { timeout: 20_000 };
export const newEmail = () => `admin${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;

export async function signInWithGoogle(page: Page, email: string) {
  const [popup] = await Promise.all([page.waitForEvent('popup', POPUP), page.getByRole('button', { name: 'Sign in with Google' }).click()]);
  // the emulator's page sometimes ignores the first click while it settles: click until it moves on
  await expect(async () => {
    if (popup.isClosed()) return;
    const known = popup.locator('li', { hasText: email });
    if (await known.count()) { await known.click({ timeout: 3_000 }); return; }
    await popup.locator('text=Add new account').click({ timeout: 3_000 });
    await expect(popup.locator('#email-input')).toBeVisible({ timeout: 2_000 });
  }).toPass(POPUP);
  if (!popup.isClosed() && await popup.locator('#email-input').isVisible().catch(() => false)) {
    await popup.fill('#email-input', email);
    await popup.locator('button', { hasText: 'Sign in with Google.com' }).click(POPUP);
  }
}

export async function grantAdmin(page: Page, email: string) {
  const found = await (await page.request.post(`${AUTH_API}/accounts:lookup`, { headers: OWNER, data: { email: [email] } })).json();
  const localId = found.users[0].localId;
  const res = await page.request.post(`${AUTH_API}/accounts:update`, { headers: OWNER, data: { localId, customAttributes: JSON.stringify({ admin: true }) } });
  expect(res.ok()).toBe(true);
}

const FUNCTIONS = 'http://127.0.0.1:5001/demo-tiktym/asia-south1';

/** Answers an admin Cloud Function with `result`, as a callable does (the emulator suite doesn't run functions). */
export async function stubFunction(page: Page, name: string, result: unknown | ((data: unknown) => unknown)): Promise<unknown[]> {
  const calls: unknown[] = [];
  await page.route(`${FUNCTIONS}/${name}`, async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const data = route.request().postDataJSON()?.data;
    calls.push(data);
    const answer = typeof result === 'function' ? (result as (d: unknown) => unknown)(data) : result;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ result: answer }) });
  });
  return calls;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 8, 13 + i)).toISOString().slice(0, 10));
const tiles = (day: string, o: Record<string, unknown> = {}) => ({
  day, accounts: 1250, active1: 30, active7: 120, active28: 300, activation: { of: 10, logged: 6 }, retention: { of: 8, active: 2 }, ...o,
});
export const METRICS = {
  days: days.map((day, i) => ({ day, signUps: i === 29 ? 7 : i % 3, active7: 100 + i, logs: i === 28 ? 0 : 40 + i, minutes: 1000 + i * 10 })),
  latest: tiles(days[29]),
  weekBefore: tiles(days[22], { accounts: 1200, active7: 125, activation: { of: 10, logged: 5 } }),
};


/** Signs in with a new Google account, gives it the admin claim, and signs in again so the console opens. */
export async function signInAsAdmin(page: Page): Promise<string> {
  const email = newEmail();
  await signInWithGoogle(page, email);
  await expect(page.getByText("This account isn't an admin.")).toBeVisible(POPUP);
  await grantAdmin(page, email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signInWithGoogle(page, email);
  await expect(page.locator('.topbar .who')).toHaveText(email, POPUP);
  return email;
}
