import { expect, test } from '@playwright/test';
import { grantAdmin, METRICS, newEmail, POPUP, signInAsAdmin, signInWithGoogle, stubFunction } from './helpers';

// The admin console's sign-in and its Metrics page.

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
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
  await expect(page.getByRole('heading', { name: 'Metrics' })).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible(POPUP);
  await expect(page.locator('.topbar .who')).toHaveText(email);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});

test('the metrics page shows the tiles, 30-day charts with a tooltip, and the same numbers as a table (ADMIN-06)', async ({ page }) => {
  await signInAsAdmin(page);
  await expect(page.getByText('Accounts as of 12 Oct')).toBeVisible(POPUP);
  const tile = (label: string) => page.getByRole('region', { name: label });
  await expect(tile('Accounts')).toContainText('1,250');
  await expect(tile('Accounts')).toContainText('+50 from a week before');
  await expect(tile('Active, 7 days')).toContainText('−5 from a week before');
  await expect(tile('Activation')).toContainText('60%');
  await expect(tile('Activation')).toContainText('+10 pts from a week before');
  await expect(tile('7-day retention')).toContainText('25%');

  const charts = page.locator('figure.chart');
  await expect(charts.locator('figcaption b')).toHaveText(['Sign-ups', 'Active loggers, 7 days', 'Entries', 'Minutes logged']);
  const signUps = charts.first();
  await expect(signUps.locator('.from')).toHaveText('13 Sept');
  await expect(signUps.locator('.to')).toHaveText('12 Oct');
  await signUps.locator('rect.hit').last().hover();
  await expect(signUps.locator('.tip')).toHaveText('12 Oct 7');
  await expect(signUps.locator('figcaption')).toContainText('35 in 30 days');
  await expect(charts.nth(1).locator('figcaption')).toContainText('129 on 12 Oct'); // a rolling count: the newest day, not a sum
  await expect(charts.nth(2).locator('path.bar').nth(28)).toHaveAttribute('d', ''); // a day with no entries draws no bar

  await page.getByText('Show the numbers as a table').click();
  await expect(page.locator('.table tbody tr').first()).toHaveText(/12 Oct.*7.*129.*69.*1,290/);
  await expect(page.locator('.table tbody tr')).toHaveCount(30);
});

test('before the nightly job has run, the page says when the totals arrive and still draws the charts (ADMIN-06)', async ({ page }) => {
  await stubFunction(page, 'adminMetrics', { ...METRICS, latest: null, weekBefore: null });
  await signInAsAdmin(page);
  await expect(page.getByText('No nightly totals yet')).toBeVisible(POPUP);
  await expect(page.getByText("The account totals appear after the nightly job's first run, at 00:30 India time.")).toBeVisible();
  await expect(page.locator('figure.chart')).toHaveCount(4);
});
