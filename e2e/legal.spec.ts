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
