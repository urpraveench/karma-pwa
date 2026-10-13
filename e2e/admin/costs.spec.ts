import { expect, test } from '@playwright/test';
import { METRICS, signInAsAdmin, stubFunction } from './helpers';

// The Costs page (ADMIN-13), with adminCosts stubbed. Reading BigQuery and Cloud Monitoring is checked by hand on the
// real project (to-do.md); the sums and levels are unit-tested (tests/costs.test.ts).

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
  await page.goto('/');
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));

const limit = (o: Record<string, unknown>) => ({ unit: 'count', link: 'https://console.firebase.google.com/project/demo-tiktym/firestore/usage', ...o });

test('shows this month\'s spend by service and each limit with its level in words (ADMIN-13)', async ({ page }) => {
  await stubFunction(page, 'adminCosts', {
    billing: { status: 'ok', currency: 'INR', total: 44.34, services: [{ service: 'Cloud Run Functions', cost: 41.24 }, { service: 'Cloud Firestore', cost: 3.1 }] },
    limits: [
      limit({ id: 'resend-day', label: 'Resend emails today', limit: 100, used: 95, level: 'red' }),
      limit({ id: 'firestore-reads', label: 'Firestore reads today', limit: 50_000, used: 36_000, level: 'amber' }),
      limit({ id: 'hosting', label: 'Hosting transfer today', unit: 'bytes', limit: 360 * 1024 * 1024, used: 12 * 1024 * 1024, level: 'ok' }),
      limit({ id: 'app-check', label: 'App Check checks this month', limit: 10_000, used: null, level: null, error: 'Permission denied.' }),
    ],
  });
  await signInAsAdmin(page);
  await page.getByRole('link', { name: 'Costs' }).click();
  const cloud = page.getByRole('region', { name: 'Google Cloud this month' });
  await expect(cloud).toContainText('₹44.34');
  await expect(cloud.locator('tr')).toHaveText(['Cloud Run Functions₹41.24', 'Cloud Firestore₹3.10']);
  const item = (label: string) => page.locator('.limits li', { hasText: label });
  await expect(item('Resend emails today')).toContainText('Over 90%95 of 100 (95%)');
  await expect(item('Firestore reads today')).toContainText('Over 70%');
  await expect(item('Firestore reads today')).toContainText('36,000 of 50,000 (72%)');
  await expect(item('Hosting transfer today')).toContainText('12 MB of 360 MB (3%)');
  await expect(item('App Check checks this month')).toContainText("Couldn't read: Permission denied.");
  await expect(item('Firestore reads today').getByRole('link', { name: 'Open console' })).toHaveAttribute('href', /firestore\/usage/);
});

test('before the billing export has data, says so and still shows the limits (ADMIN-13)', async ({ page }) => {
  await stubFunction(page, 'adminCosts', {
    billing: { status: 'unavailable', reason: 'The billing export has no data yet; it can take a day after turning it on.' },
    limits: [limit({ id: 'resend-day', label: 'Resend emails today', limit: 100, used: 3, level: 'ok' })],
  });
  await signInAsAdmin(page);
  await page.goto('/#costs');
  await expect(page.getByRole('region', { name: 'Google Cloud this month' })).toContainText("Couldn't read the billing export: The billing export has no data yet; it can take a day after turning it on.");
  await expect(page.getByRole('region', { name: 'Google Cloud this month' })).toContainText('Billing › Billing export (FOCUS or Standard usage cost');
  await expect(page.locator('.limits li')).toContainText('OK3 of 100 (3%)');
});
