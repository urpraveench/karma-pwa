import { expect, test } from '@playwright/test';
import { METRICS, signInAsAdmin, stubFunction } from './helpers';

// The Health page (ADMIN-14), with adminHealth stubbed. Reading Cloud Monitoring is checked by hand on the real
// project (to-do.md); the sums and order are unit-tested (tests/health.test.ts).

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
  await page.goto('/');
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));

const row = (name: string, runs: number, errors: number) => ({ name, runs, errors, logs: `https://console.cloud.google.com/run/detail/asia-south1/${name}/logs?project=tiktym` });

test('lists each function\'s runs and errors, errors first, with links to logs (ADMIN-14)', async ({ page }) => {
  await stubFunction(page, 'adminHealth', { status: 'ok', rows: [row('recapsend', 43, 3), row('reminderssend', 900, 0)] });
  await signInAsAdmin(page);
  await page.getByRole('link', { name: 'Health' }).click();
  await expect(page.getByText('1 function had errors in the last 24 hours.')).toBeVisible();
  await expect(page.locator('.health tbody tr')).toHaveText(['recapsend433 (7%)Logs', 'reminderssend9000Logs']);
  await expect(page.locator('.health tbody tr').first().getByRole('link', { name: 'Logs' })).toHaveAttribute('href', /run\/detail\/asia-south1\/recapsend\/logs/);
});

test('says when all is well, and what to do when Monitoring can\'t be read (ADMIN-14)', async ({ page }) => {
  let answer: unknown = { status: 'ok', rows: [row('reminderssend', 900, 0)] };
  await stubFunction(page, 'adminHealth', () => answer);
  await signInAsAdmin(page);
  await page.goto('/#health');
  await expect(page.getByText('No errors in the last 24 hours.')).toBeVisible();
  answer = { status: 'unavailable', reason: 'Permission denied.' };
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText("Couldn't read Cloud Monitoring: Permission denied. The functions' service account needs the Monitoring Viewer role.")).toBeVisible();
});
