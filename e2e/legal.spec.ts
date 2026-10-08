import { expect, test } from './helpers';

test.describe('Terms of Service (LEGAL-01)', () => {
  test('names the operator, the eligibility, and Indian law and courts', async ({ page }) => {
    await page.goto('/terms/');
    await expect(page).toHaveTitle('Terms of Service · TikTym');
    await expect(page.locator('h1')).toHaveText('Terms of Service');
    const body = page.locator('main');
    await expect(body).toContainText('Pramal IT Services Private Limited');
    await expect(body).toContainText('U72900AP2022PTC121639');
    await expect(body).toContainText('18 or older');
    await expect(body).toContainText('not medical, health, fitness, psychological or professional advice');
    await expect(body).toContainText('governed by the laws of India');
    await expect(body).toContainText('Andhra Pradesh, India, have exclusive jurisdiction');
    await expect(page.locator('a[href="mailto:praveen.cherukuru@gmail.com"]').first()).toBeVisible();
  });

  test('links to the Privacy Policy and back to the app', async ({ page }) => {
    await page.goto('/terms/');
    await page.locator('footer a', { hasText: 'Privacy Policy' }).click();
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
    await page.locator('a.back').click();
    await expect(page.locator('.login h1')).toHaveText('TikTym');
  });
});

test.describe('Privacy Policy (LEGAL-02)', () => {
  test('covers the DPDP Act essentials', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page).toHaveTitle('Privacy Policy · TikTym');
    const body = page.locator('main');
    await expect(body).toContainText('Digital Personal Data Protection Act, 2023');
    await expect(body).toContainText('Data Fiduciary');
    await expect(body).toContainText('Pramal IT Services Private Limited');
    for (const what of ['Account', 'Your practices', 'Your entries', 'Settings', 'Security signals', 'Technical data'])
      await expect(page.locator('td', { hasText: new RegExp(`^${what}$`) })).toBeVisible();
    await expect(body).toContainText('Google Cloud Firestore in Mumbai, India');
    for (const right of ['Access', 'Correct or update', 'Erase', 'Withdraw consent', 'Nominate', 'Raise a grievance'])
      await expect(page.locator('li strong', { hasText: right })).toBeVisible();
    await expect(body).toContainText('Data Protection Board of India');
    await expect(body).toContainText('aged 18 and over');
    // Google requires this wording when the reCAPTCHA badge is hidden
    await expect(body).toContainText('This site is protected by reCAPTCHA, and the Google Privacy Policy and Terms of Service apply.');
    await expect(page.locator('a[href="https://policies.google.com/privacy"]')).toBeVisible();
    await expect(page.locator('a[href="https://policies.google.com/terms"]')).toBeVisible();
  });

  test('links to the Terms', async ({ page }) => {
    await page.goto('/privacy/');
    await page.locator('footer a', { hasText: 'Terms of Service' }).click();
    await expect(page.locator('h1')).toHaveText('Terms of Service');
  });
});
