import { expect, test, type Page } from '@playwright/test';

// The admin console against the Auth emulator, whose Google page stands in for Google. The `admin` claim is set the
// way `npm run admin:grant` sets it, through the Admin API (here the emulator's, with its owner token).

const AUTH_API = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-tiktym';
const OWNER = { Authorization: 'Bearer owner' };
const POPUP = { timeout: 20_000 };
const newEmail = () => `admin${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;

async function signInWithGoogle(page: Page, email: string) {
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

async function grantAdmin(page: Page, email: string) {
  const found = await (await page.request.post(`${AUTH_API}/accounts:lookup`, { headers: OWNER, data: { email: [email] } })).json();
  const localId = found.users[0].localId;
  const res = await page.request.post(`${AUTH_API}/accounts:update`, { headers: OWNER, data: { localId, customAttributes: JSON.stringify({ admin: true }) } });
  expect(res.ok()).toBe(true);
}

const FUNCTIONS = 'http://127.0.0.1:5001/demo-tiktym/asia-south1';

/** Answers an admin Cloud Function with `result`, as a callable does (the emulator suite doesn't run functions). */
async function stubFunction(page: Page, name: string, result: unknown) {
  await page.route(`${FUNCTIONS}/${name}`, route => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ result }),
  }));
}

const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 8, 13 + i)).toISOString().slice(0, 10));
const tiles = (day: string, o: Record<string, unknown> = {}) => ({
  day, accounts: 1250, active1: 30, active7: 120, active28: 300, activation: { of: 10, logged: 6 }, retention: { of: 8, active: 2 }, ...o,
});
const METRICS = {
  days: days.map((day, i) => ({ day, signUps: i === 29 ? 7 : i % 3, active7: 100 + i, logs: i === 28 ? 0 : 40 + i, minutes: 1000 + i * 10 })),
  latest: tiles(days[29]),
  weekBefore: tiles(days[22], { accounts: 1200, active7: 125, activation: { of: 10, logged: 5 } }),
};

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
  await page.goto('/');
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));

test('signed out, the console offers only Google sign-in (ADMIN-05)', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('TikTym admin');
  await expect(page.getByRole('button')).toHaveText(['Sign in with Google']);
  await expect(page).toHaveTitle('TikTym admin');
});

test('an account without the admin claim sees "not an admin" and no console, then signs out (ADMIN-05)', async ({ page }) => {
  const email = newEmail();
  await signInWithGoogle(page, email);
  await expect(page.getByText("This account isn't an admin.")).toBeVisible(POPUP);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Metrics' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});

test('an account with the admin claim opens the console (ADMIN-05)', async ({ page }) => {
  const email = newEmail();
  await signInWithGoogle(page, email);
  await expect(page.getByText("This account isn't an admin.")).toBeVisible(POPUP);
  await grantAdmin(page, email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signInWithGoogle(page, email);
  await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible(POPUP);
  await expect(page.locator('.topbar .who')).toHaveText(email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});

test('the metrics page shows the tiles, 30-day charts with a tooltip, and the same numbers as a table (ADMIN-06)', async ({ page }) => {
  const email = newEmail();
  await signInWithGoogle(page, email);
  await expect(page.getByText("This account isn't an admin.")).toBeVisible(POPUP);
  await grantAdmin(page, email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signInWithGoogle(page, email);

  await expect(page.getByText('Accounts as of 12 Oct')).toBeVisible(POPUP);
  const tile = (label: string) => page.getByRole('region', { name: label });
  await expect(tile('Accounts')).toContainText('1,250');
  await expect(tile('Accounts')).toContainText('+50 from a week before');
  await expect(tile('Active, 7 days')).toContainText('−5 from a week before');
  await expect(tile('Activation')).toContainText('60%');
  await expect(tile('Activation')).toContainText('+10 pts from a week before');
  await expect(tile('7-day retention')).toContainText('25%');

  const charts = page.locator('figure.chart');
  await expect(charts.locator('figcaption b')).toHaveText(['Sign-ups', 'Active loggers, 7 days', 'Entries', 'Minutes logged']);
  const signUps = charts.first();
  await expect(signUps.locator('.from')).toHaveText('13 Sept');
  await expect(signUps.locator('.to')).toHaveText('12 Oct');
  await signUps.locator('rect.hit').last().hover();
  await expect(signUps.locator('.tip')).toHaveText('12 Oct 7');
  await expect(signUps.locator('figcaption')).toContainText('35 in 30 days');
  await expect(charts.nth(1).locator('figcaption')).toContainText('129 on 12 Oct'); // a rolling count: the newest day, not a sum
  await expect(charts.nth(2).locator('path.bar').nth(28)).toHaveAttribute('d', ''); // a day with no entries draws no bar

  await page.getByText('Show the numbers as a table').click();
  await expect(page.locator('.table tbody tr').first()).toHaveText(/12 Oct.*7.*129.*69.*1,290/);
  await expect(page.locator('.table tbody tr')).toHaveCount(30);
});

test('before the nightly job has run, the page says when the totals arrive and still draws the charts (ADMIN-06)', async ({ page }) => {
  await stubFunction(page, 'adminMetrics', { ...METRICS, latest: null, weekBefore: null });
  const email = newEmail();
  await signInWithGoogle(page, email);
  await expect(page.getByText("This account isn't an admin.")).toBeVisible(POPUP);
  await grantAdmin(page, email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signInWithGoogle(page, email);
  await expect(page.getByText('No nightly totals yet')).toBeVisible(POPUP);
  await expect(page.getByText("The account totals appear after the nightly job's first run, at 00:30 India time.")).toBeVisible();
  await expect(page.locator('figure.chart')).toHaveCount(4);
});
