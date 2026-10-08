import { expect, test, type Page } from '@playwright/test';

// Google sign-in against the Auth emulator, which stands in for Google with a page of pretend accounts.

const newEmail = () => `g${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;

// The emulator's sign-in window is slowest when every test worker is busy, so its steps get extra time.
const POPUP = { timeout: 20_000 };

async function continueWithGoogle(page: Page, email: string, name: string) {
  const [popup] = await Promise.all([page.waitForEvent('popup', POPUP), page.click('.gbtn')]);
  await popup.locator('text=Add new account').click(POPUP);
  await popup.fill('#email-input', email);
  await popup.fill('#display-name-input', name);
  await popup.locator('button', { hasText: 'Sign in with Google.com' }).click(POPUP);
  await expect(page.locator('.hello')).toBeVisible(POPUP);
}

async function signInAgainWithGoogle(page: Page, email: string) {
  const [popup] = await Promise.all([page.waitForEvent('popup', POPUP), page.click('.gbtn')]);
  await popup.locator('li', { hasText: email }).click(POPUP); // the emulator lists accounts it has seen
  await expect(page.locator('.hello')).toBeVisible(POPUP);
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', d => d.accept());
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym');
});

test('first Google sign-in creates the account with the defaults and greets by first name (AUTH-19, AUTH-25)', async ({ page }) => {
  await continueWithGoogle(page, newEmail(), 'Asha Kumar');
  await expect(page.locator('.hello')).toHaveText(/, Asha$/);
  await expect(page.locator('.cat .cat-name')).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation']);
  await page.locator('.tab', { hasText: 'Setup' }).click();
  await expect(page.locator('.li', { hasText: 'Asha Kumar' })).toBeVisible(); // the Account row
});

test('signing in with Google again returns to the same data (AUTH-19)', async ({ page, browser }) => {
  const email = newEmail();
  await continueWithGoogle(page, email, 'Ravi');
  await page.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(page.locator('.toast span')).toHaveText('Reading done for today');
  const phone2 = await (await browser.newContext({ ...test.info().project.use })).newPage();
  await phone2.goto('/');
  await signInAgainWithGoogle(phone2, email);
  await expect(phone2.locator('.cat').nth(1).locator('.cat-meta')).toHaveText('Done, 30 logged');
});

test('Google with an email that already has a password account opens that account (AUTH-24)', async ({ page, browser }) => {
  const email = newEmail();
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', email);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
  await page.locator('.cat').nth(0).locator('.qbtn').click();
  await expect(page.locator('.toast span')).toHaveText('Exercise done for today');

  const phone2 = await (await browser.newContext({ ...test.info().project.use })).newPage();
  await phone2.goto('/');
  await continueWithGoogle(phone2, email, 'Same Person');
  await expect(phone2.locator('.cat').nth(0).locator('.cat-meta')).toHaveText('Done, 30 logged');
});

test.describe('installed on an iPhone home screen', () => {
  // iOS sets navigator.standalone when a web app runs from the home screen.
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  });

  test('Google sign-in uses a full-page redirect and comes back signed in (AUTH-27)', async ({ page, context }) => {
    let popups = 0;
    context.on('page', () => popups++);
    await page.goto('/');
    await page.click('.gbtn');
    await page.waitForURL(/\/emulator\/auth\/handler/, POPUP); // the app itself goes to the sign-in page
    await page.locator('text=Add new account').click(POPUP);
    await page.fill('#email-input', newEmail());
    await page.fill('#display-name-input', 'Meera Iyer');
    await page.locator('button', { hasText: 'Sign in with Google.com' }).click(POPUP);
    await expect(page.locator('.hello')).toHaveText(/, Meera$/, POPUP);
    await expect(page.locator('.cat .cat-name')).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation']);
    expect(popups, 'no pop-up window').toBe(0);
  });
});
