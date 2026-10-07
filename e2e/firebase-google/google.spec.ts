import { expect, test, type Page } from '@playwright/test';

// Google sign-in against the Auth emulator, which stands in for Google with a page of pretend accounts.

const newEmail = () => `g${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;

async function continueWithGoogle(page: Page, email: string, name: string) {
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('.gbtn')]);
  await popup.locator('text=Add new account').click();
  await popup.fill('#email-input', email);
  await popup.fill('#display-name-input', name);
  await popup.locator('button', { hasText: 'Sign in with Google.com' }).click();
  await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
}

async function signInAgainWithGoogle(page: Page, email: string) {
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('.gbtn')]);
  await popup.locator('li', { hasText: email }).click(); // the emulator lists accounts it has seen
  await expect(page.locator('.hello')).toBeVisible({ timeout: 15_000 });
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
  await expect(page.locator('.list').last().locator('.li').first()).toContainText('Asha Kumar');
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
