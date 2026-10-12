import { expect, test } from '@playwright/test';
import { METRICS, signInAsAdmin, stubFunction } from './helpers';

// The send history (ADMIN-12), with adminHistory stubbed. What each line says is unit-tested (tests/adminLog.test.ts).

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
  await page.goto('/');
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));

const entry = (o: Record<string, unknown>) => ({ by: 'me@example.com', audience: null, queued: 1, held: 0, sent: 1, skipped: 0, failed: 0, skippedWhy: {}, ...o });

test('lists every send newest first, with how far each has got, and refreshes (ADMIN-12)', async ({ page }) => {
  let sent = 30;
  await stubFunction(page, 'adminHistory', () => ({ entries: [
    entry({ id: 'b1', kind: 'email', at: '2026-10-13T04:30:00Z', audience: 'everyone', headline: 'The challenge starts', queued: 40, sent, skipped: 2, skippedWhy: { off: 2 } }),
    entry({ id: 't1', kind: 'push-test', at: '2026-10-12T15:00:00Z', headline: 'Day 1 of 100' }),
  ] }));
  await signInAsAdmin(page);
  await page.getByRole('link', { name: 'History' }).click();
  const items = page.locator('.history li');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('EmailThe challenge starts13 Oct, 10:00 IST');
  await expect(items.first()).toContainText('Everyone');
  await expect(items.first()).toContainText('Sending: 32 of 40 done. 30 sent, 2 skipped (2 News off)');
  await expect(items.nth(1)).toContainText('Push testDay 1 of 10012 Oct, 20:30 IST');
  await expect(items.nth(1)).toContainText('Just me (me@example.com)');
  sent = 38;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(items.first()).toContainText('38 sent, 2 skipped (2 News off)');
  await expect(items.first()).not.toContainText('Sending');
});

test('says so when nothing has been sent yet (ADMIN-12)', async ({ page }) => {
  await stubFunction(page, 'adminHistory', { entries: [] });
  await signInAsAdmin(page);
  await page.goto('/#history');
  await expect(page.getByText('Nothing sent yet. Emails and pushes sent from this console appear here, tests included.')).toBeVisible();
});
