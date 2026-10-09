import { expect, test, DEMO, loadSampleData, open, signIn, tab, startWithDefaults } from './helpers';

test.describe('Sign-in (test mode)', () => {
  test('shows the test login hint', async ({ page }) => {
    await open(page);
    await expect(page.locator('.devhint')).toContainText(DEMO.email);
  });

  test('asks for both fields', async ({ page }) => {
    await open(page);
    await page.click('button[type=submit]');
    await expect(page.locator('.err')).toHaveText('Enter your email and password.');
  });

  test('rejects a wrong password', async ({ page }) => {
    await open(page);
    await page.fill('#em', DEMO.email);
    await page.fill('#pw', 'wrong');
    await page.click('button[type=submit]');
    await expect(page.locator('.err')).toHaveText("That email and password don't match the test login.");
  });

  test('signs in and greets by time of day', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.hello')).toHaveText('Good morning, Demo');
    await expect(page.locator('.date')).toHaveText('Wednesday 7 October');
  });

  test('the demo email is case-insensitive (AUTH-05)', async ({ page }) => {
    await open(page);
    await page.fill('#em', 'DEMO@TikTym.local');
    await page.fill('#pw', DEMO.password);
    await page.click('button[type=submit]');
    await startWithDefaults(page);
  });

  test('Google explains it is not set up in test mode (AUTH-08)', async ({ page }) => {
    await open(page);
    await page.click('.gbtn');
    await expect(page.locator('.toast span')).toContainText("Google sign-in isn't set up yet");
  });

  test('stays signed in after a reload', async ({ page }) => {
    await signIn(page);
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible();
  });

  test('signs out, and data is still there after signing back in', async ({ page }) => {
    await signIn(page);
    await loadSampleData(page);
    await page.locator('.li', { hasText: 'Sign out' }).click();
    await expect(page.locator('.login h1')).toBeVisible();
    await page.fill('#em', DEMO.email);
    await page.fill('#pw', DEMO.password);
    await page.click('button[type=submit]');
    await tab(page, 'History').click();
    expect(await page.locator('.log').count()).toBeGreaterThan(50);
  });
});

test('Continue with Google comes first, as the main button; email sits below (AUTH-30)', async ({ page }) => {
  await open(page);
  const order = await page.locator('.login').evaluate(el =>
    [...el.querySelectorAll('h1, .lead, .gbtn, .or, form, #em')].map(e => e.matches('.gbtn') ? 'google' : e.matches('.or') ? e.textContent : e.matches('#em') ? 'email' : e.tagName.toLowerCase() === 'form' ? 'form' : e.matches('h1') ? 'title' : 'tagline'));
  expect(order).toEqual(['title', 'tagline', 'google', 'or use your email', 'form', 'email']);
  await expect(page.locator('.gbtn')).toHaveText('Continue with Google');
  await expect(page.locator('button[type=submit]')).toHaveClass(/btn-2/); // the lighter button
});
