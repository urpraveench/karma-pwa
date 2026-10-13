import { expect, test, type Page } from '@playwright/test';
import { METRICS, signInAsAdmin, stubFunction } from './helpers';

// The push composer (ADMIN-10, ADMIN-11). The functions are stubbed: these tests check what the page sends them and
// how it shows their answers. Quiet hours and sending once are unit-tested (tests/pushBroadcast.test.ts).

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
  await page.goto('/');
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));

async function openPush(page: Page) {
  await signInAsAdmin(page);
  await page.getByRole('link', { name: 'Push' }).click();
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
}

test('write, see it, count, then send with a second tap; night-time pushes wait (ADMIN-10, ADMIN-11)', async ({ page }) => {
  const counts = await stubFunction(page, 'adminPushCount', { count: 12 });
  const sends = await stubFunction(page, 'adminPushSend', { id: 'p1', queued: 12, held: 3 });
  await openPush(page);
  await page.getByLabel('Active in the last 7 days').check();
  await page.getByLabel('Title').fill('Day 1 of 100');
  await page.getByLabel('Text').fill('Log 5 minutes and you are in.');
  await expect(page.locator('.notif')).toContainText('Day 1 of 100Log 5 minutes and you are in.');
  await expect(page.getByText('29 of 160 characters')).toBeVisible();

  const send = page.getByRole('button', { name: /Send to|Count to send/ });
  await expect(send).toHaveText('Count to send');
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Count people' }).click();
  await expect(send).toHaveText('Send to 12 people…');
  const draft = { audience: 'active7', title: 'Day 1 of 100', body: 'Log 5 minutes and you are in.', url: '/' };
  expect(counts).toEqual([{ draft }]);

  await send.click();
  const confirm = page.getByRole('alertdialog', { name: 'Confirm sending' });
  await expect(confirm).toContainText('This goes to 12 people (active in the last 7 days)');
  expect(sends).toEqual([]);
  await confirm.getByRole('button', { name: 'Yes, send it' }).click();
  await expect(page.getByRole('status')).toHaveText('Queued for 12 people; 3 of them at night where they are, so theirs waits until 10 am. History shows how it went.');
  expect(sends).toEqual([{ draft }]);
  await expect(send).toHaveText('Count to send');

  await page.getByLabel('Title').fill('Changed');
  await page.getByRole('button', { name: 'Count people' }).click();
  await expect(send).toHaveText('Send to 12 people…');
  await page.getByLabel('Text').fill('Changed too.');
  await expect(send).toHaveText('Count to send'); // a count of an older draft can't be sent
});

test('a test goes to my own devices; a bad link is caught first; nobody to send to is said plainly (ADMIN-10)', async ({ page }) => {
  const tests = await stubFunction(page, 'adminPushTest', { devices: 2 });
  await stubFunction(page, 'adminPushCount', { count: 0 });
  await openPush(page);
  await page.getByLabel('Title').fill('Hello');
  await page.getByLabel('Text').fill('Body');
  await page.getByLabel('Opens (optional)').fill('https://tiktym.com');
  await expect(page.getByText('The link must be a path in the app, starting with / (like /?tab=insights).')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send a test to my devices' })).toBeDisabled();
  await page.getByLabel('Opens (optional)').fill('/?tab=insights');
  await page.getByRole('button', { name: 'Send a test to my devices' }).click();
  await expect(page.getByRole('status')).toHaveText('Test sent to 2 of your devices.');
  expect(tests).toEqual([{ draft: { audience: 'devices', title: 'Hello', body: 'Body', url: '/?tab=insights' } }]);
  await page.getByRole('button', { name: 'Count people' }).click();
  await expect(page.getByRole('button', { name: 'Nobody to send to' })).toBeDisabled();
});

test('push to one person: checked by email, and said plainly when they have no device (ADMIN-10)', async ({ page }) => {
  const checks = await stubFunction(page, 'adminPushCount', (d: unknown) =>
    ((d as { draft: { to?: string } }).draft.to === 'nodevice@example.com' ? { count: 0, note: 'That account has no device with notifications on.' } : { count: 1 }));
  const sends = await stubFunction(page, 'adminPushSend', { id: 'p9', queued: 1, held: 0 });
  await openPush(page);
  await page.getByLabel('One person').check();
  await page.getByLabel('Title').fill('Hi Ravi');
  await page.getByLabel('Text').fill('Testing a reminder.');
  await page.getByLabel('Their email').fill('nodevice@example.com');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('That account has no device with notifications on.');
  await expect(page.getByRole('button', { name: 'Nobody to send to' })).toBeDisabled();

  await page.getByLabel('Their email').fill('Ravi@Example.com');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByRole('button', { name: 'Send to ravi@example.com…' }).click();
  await page.getByRole('button', { name: 'Yes, send it' }).click();
  await expect(page.getByRole('status')).toContainText('Queued for 1 person');
  expect(checks).toHaveLength(2);
  expect(sends).toEqual([{ draft: { audience: 'person', title: 'Hi Ravi', body: 'Testing a reminder.', url: '/', to: 'ravi@example.com' } }]);
});
