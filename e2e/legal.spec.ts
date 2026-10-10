import { expect, open, signIn, tab, test } from './helpers';

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

  test('explains the anonymous daily totals (LEGAL-06)', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.locator('h2', { hasText: 'Anonymous daily totals' })).toBeVisible();
    await expect(page.locator('main')).toContainText("Nothing that identifies you or your device is included");
  });

  test('describes Google Analytics, on unless turned off, and how to turn it off (LEGAL-05)', async ({ page }) => {
    await page.goto('/privacy/');
    const body = page.locator('main');
    await expect(page.locator('td', { hasText: /^Usage statistics \(on unless you turn them off\)$/ })).toBeVisible();
    await expect(body).toContainText('Advertising features are switched off');
    await expect(body).toContainText('turn them off in Setup › Notifications and privacy');
    await expect(body).toContainText('shows a notice with an Opt out button');
    await expect(body).toContainText('kept in Google Analytics for up to 14 months');
    await expect(body).not.toContainText("we don't use analytics");
  });

  test('discloses emails, reminders, Resend and backups, on by default with a way out (LEGAL-07)', async ({ page }) => {
    await page.goto('/privacy/');
    const body = page.locator('main');
    for (const what of ['Emails about your practice', 'Phone reminders (when available)'])
      await expect(page.locator('td', { hasText: new RegExp(`^${what.replace(/[()]/g, '\\$&')}$`) })).toBeVisible();
    await expect(body).toContainText("We don't track whether you open emails");
    await expect(body).toContainText('Resend (Resend, Inc., USA)');
    await expect(body).toContainText('daily backups are kept for 7 days and weekly ones for 8 weeks');
    await expect(body).toContainText('the unsubscribe link in any email');
    await page.goto('/terms/');
    await expect(page.locator('main')).toContainText('Each is on from the start, and you can turn each off at any time');
  });

  test('links to the Terms', async ({ page }) => {
    await page.goto('/privacy/');
    await page.locator('footer a', { hasText: 'Terms of Service' }).click();
    await expect(page.locator('h1')).toHaveText('Terms of Service');
  });
});

test.describe('legal links (AUTH-21)', () => {
  test('the login screen links to both pages', async ({ page }) => {
    await open(page);
    await expect(page.locator('.login .legal')).toHaveText('By continuing you agree to the Terms and Privacy Policy, including emails about your practice and usage statistics. You can turn either off in Setup or from any email.'); // LEGAL-07
    await page.locator('.login .legal a', { hasText: 'Terms' }).click();
    await expect(page.locator('h1')).toHaveText('Terms of Service');
    await page.goBack();
    await page.locator('.login .legal a', { hasText: 'Privacy Policy' }).click();
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
  });

  test('Setup › About links to both pages', async ({ page }) => {
    await signIn(page);
    await tab(page, 'Setup').click();
    await page.locator('a.li', { hasText: 'Terms of Service' }).click();
    await expect(page.locator('h1')).toHaveText('Terms of Service');
    await page.goBack();
    await tab(page, 'Setup').click();
    await page.locator('a.li', { hasText: 'Privacy Policy' }).click();
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
  });

  test('no reCAPTCHA notice while App Check is off (test mode)', async ({ page }) => {
    await open(page);
    await expect(page.locator('.login .recaptcha')).toHaveCount(0);
  });
});

test('the app, Terms and Privacy have search descriptions of 25 to 160 characters (GTM-18)', async ({ page }) => {
  for (const path of ['/', '/terms/', '/privacy/']) {
    await page.goto(path);
    const d = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(d.length, `${path}: "${d}"`).toBeGreaterThanOrEqual(25);
    expect(d.length, `${path}: "${d}"`).toBeLessThanOrEqual(160);
  }
});
