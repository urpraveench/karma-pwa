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

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
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
  await expect(page.getByText('Admin console')).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: 'Admin console' })).toBeVisible(POPUP);
  await expect(page.locator('.bar .who')).toHaveText(email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});
