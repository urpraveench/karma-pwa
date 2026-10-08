import { expect, test, type Browser, type Page } from '@playwright/test';

// Firebase mode against the local Auth and Firestore emulators. Each test uses its own new account.

const PASSWORD = 'secret123';
const newEmail = () => `u${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`;
const toast = (page: Page) => page.locator('.toast span').first();

async function openLogin(page: Page, promptAnswer = 'DELETE') {
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? promptAnswer : undefined));
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym');
}

async function signUp(page: Page, email = newEmail()) {
  await openLogin(page);
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', email);
  await page.fill('#pw', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
  return email;
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.fill('#em', email);
  await page.fill('#pw', password);
  await page.click('button[type=submit]');
}

async function onNewDevice(browser: Browser, email: string) {
  const ctx = await browser.newContext({ ...test.info().project.use });
  const page = await ctx.newPage();
  await openLogin(page);
  await signIn(page, email);
  await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
  return page;
}

test.describe('Firebase sign-in', () => {
  test('no test-mode hint, and sign-in/sign-up links (AUTH-11)', async ({ page }) => {
    await openLogin(page);
    await expect(page.locator('.devhint')).toHaveCount(0);
    await page.locator('.link', { hasText: 'Create an account' }).click();
    await expect(page.locator('label[for=pw]')).toHaveText('Password (6+ characters)');
    await expect(page.locator('button[type=submit]')).toHaveText('Create account');
    await page.locator('.link', { hasText: 'I already have an account' }).click();
    await expect(page.locator('button[type=submit]')).toHaveText('Sign in');
  });

  test('sign up seeds the default practices and shows the synced badge (AUTH-12, FIRST-01)', async ({ page }) => {
    await signUp(page);
    await expect(page.locator('.cat .cat-name')).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation']);
    await page.locator('.tab', { hasText: 'Setup' }).click();
    await expect(page.locator('.badge', { hasText: 'Synced with Firebase' })).toBeVisible();
  });

  test('sign up with an email that already has an account (AUTH-13)', async ({ page, browser }) => {
    const email = await signUp(page);
    const other = await (await browser.newContext({ ...test.info().project.use })).newPage();
    await openLogin(other);
    await other.locator('.link', { hasText: 'Create an account' }).click();
    await signIn(other, email);
    await expect(other.locator('.err')).toHaveText('That email already has an account. Sign in instead.');
  });

  test('sign up with a short password (AUTH-14)', async ({ page }) => {
    await openLogin(page);
    await page.locator('.link', { hasText: 'Create an account' }).click();
    await signIn(page, newEmail(), '123');
    await expect(page.locator('.err')).toHaveText('Use at least 6 characters.');
  });

  test('wrong password and unknown email (AUTH-15)', async ({ page, browser }) => {
    const email = await signUp(page);
    const other = await (await browser.newContext({ ...test.info().project.use })).newPage();
    await openLogin(other);
    await signIn(other, email, 'wrong-password');
    await expect(other.locator('.err')).toHaveText("That email and password don't match.");
    await signIn(other, newEmail());
    await expect(other.locator('.err')).toHaveText("That email and password don't match.");
  });

  test('invalid email (AUTH-16)', async ({ page }) => {
    await openLogin(page);
    await signIn(page, 'not-an-email');
    await expect(page.locator('.err')).toHaveText("That doesn't look like an email address.");
  });

  test('forgot password (AUTH-17, AUTH-18)', async ({ page }) => {
    const email = await signUp(page);
    await page.locator('.tab', { hasText: 'Setup' }).click();
    await page.locator('.li', { hasText: 'Sign out' }).click();
    await page.locator('.link', { hasText: 'Forgot password?' }).click();
    await expect(page.locator('.err')).toHaveText('Enter your email above, then tap Forgot password again.');
    await page.fill('#em', email);
    await page.locator('.link', { hasText: 'Forgot password?' }).click();
    await expect(toast(page)).toHaveText('If that email has an account, a reset link is on its way.');
  });

  test('Google sign-in when it is not enabled (AUTH-20)', async ({ page }) => {
    await openLogin(page);
    await page.click('.gbtn');
    await expect(toast(page)).toContainText("Google sign-in isn't set up yet");
  });

  test('stays signed in after a reload, then signs out (AUTH-10, AUTH-23)', async ({ page }) => {
    await signUp(page);
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
    await page.locator('.tab', { hasText: 'Setup' }).click();
    await page.locator('.li', { hasText: 'Sign out' }).click();
    await expect(page.locator('.login h1')).toBeVisible();
  });
});

test.describe('Firebase sync', () => {
  test('a log on one device shows on another (SYNC-12)', async ({ page, browser }) => {
    const email = await signUp(page);
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await expect(toast(page)).toHaveText('Exercise done for today');
    const phone2 = await onNewDevice(browser, email);
    await expect(phone2.locator('.cat').nth(0).locator('.cat-meta')).toHaveText('Done, 30 logged');
  });

  test('practice edits and settings sync too (SET-17)', async ({ page, browser }) => {
    const email = await signUp(page);
    await page.locator('.tab', { hasText: 'Setup' }).click();
    await page.locator('.chip', { hasText: 'Add practice' }).click();
    await page.fill('#cn', 'Journaling');
    await page.click('.sheet button[type=submit]');
    await expect(toast(page)).toHaveText('Added Journaling');
    await page.locator('.seg button', { hasText: '3 days' }).click();
    await expect(toast(page)).toHaveText('Backlog capped at 3 days per practice');
    const phone2 = await onNewDevice(browser, email);
    await phone2.locator('.tab', { hasText: 'Setup' }).click();
    await expect(phone2.locator('.li', { hasText: 'Journaling' })).toBeVisible();
    await expect(phone2.locator('.seg button', { hasText: '3 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('logging offline syncs once back online (SYNC-11)', async ({ page, context, browser }) => {
    const email = await signUp(page);
    await context.setOffline(true);
    await page.locator('.cat').nth(1).locator('.qbtn').click();
    await expect(toast(page)).toHaveText('Reading done for today'); // no "could not save"
    await context.setOffline(false);
    const phone2 = await onNewDevice(browser, email);
    await expect(async () => {
      await phone2.reload();
      await expect(phone2.locator('.cat').nth(1).locator('.cat-meta')).toHaveText('Done, 30 logged', { timeout: 3000 });
    }).toPass({ timeout: 30_000 });
  });

  test('defaults are not re-seeded after deleting every practice (FIRST-02)', async ({ page }) => {
    await signUp(page);
    await page.locator('.tab', { hasText: 'Setup' }).click();
    for (const name of ['Exercise', 'Reading', 'Course study', 'Meditation']) {
      await page.locator('.li', { hasText: name }).click();
      await page.locator('.sheet .btn-danger').click();
      await expect(toast(page)).toHaveText(`Deleted ${name}`);
    }
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.empty')).toHaveText('No practices yet. Add one in Setup.');
  });
});

test.describe('Delete account', () => {
  test('typing anything but DELETE keeps the account (SET-14)', async ({ page }) => {
    page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'nope' : undefined));
    await page.goto('/');
    await page.locator('.link', { hasText: 'Create an account' }).click();
    await signIn(page, newEmail());
    await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
    await page.locator('.tab', { hasText: 'Setup' }).click();
    await page.locator('.li', { hasText: 'Delete account' }).click();
    await expect(toast(page)).toHaveText('Account not deleted');
    await expect(page.locator('.hello')).toBeVisible();
  });

  test('removes the account and its data (SET-13)', async ({ page, browser }) => {
    const email = await signUp(page);
    await page.locator('.tab', { hasText: 'Setup' }).click();
    await page.locator('.li', { hasText: 'Delete account' }).click();
    await expect(page.locator('.login h1')).toBeVisible({ timeout: 15_000 });
    const other = await (await browser.newContext({ ...test.info().project.use })).newPage();
    await openLogin(other);
    await signIn(other, email);
    await expect(other.locator('.err')).toHaveText("That email and password don't match.");
  });
});

test('Delete account is in the Danger zone, apart from Sign out (SET-19)', async ({ page }) => {
  await signUp(page);
  await page.locator('.tab', { hasText: 'Setup' }).click();
  const account = page.locator('.list', { has: page.locator('.li', { hasText: 'Sign out' }) });
  await expect(account).not.toContainText('Delete account');
  await expect(page.locator('.list.danger .li')).toHaveText([/^Start over/, /^Delete account/]);
  await expect(page.locator('.sect-h h2').last()).toHaveText('Danger zone');
});
