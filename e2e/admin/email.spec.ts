import { expect, test, type Page } from '@playwright/test';
import { METRICS, signInAsAdmin, stubFunction } from './helpers';

// The email composer (ADMIN-07 to ADMIN-09). The functions are stubbed: these tests check what the page sends them
// and how it shows their answers. The sending itself is unit-tested (tests/broadcast.test.ts).

const PREVIEW = { subject: 'The challenge starts', html: '<!doctype html><body><h1>The challenge starts 2 November</h1><p>Hi Praveen,</p></body>', count: 42 };

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await stubFunction(page, 'adminMetrics', METRICS);
  await page.goto('/');
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));

async function openEmail(page: Page) {
  await signInAsAdmin(page);
  await page.getByRole('link', { name: 'Email' }).click();
  await expect(page.getByRole('heading', { name: 'Email' })).toBeVisible();
  await expect(page).toHaveURL(/#email$/);
}

async function write(page: Page) {
  await page.getByLabel('Subject').fill('The challenge starts');
  await page.getByLabel('Heading').fill('The challenge starts 2 November');
  await page.getByLabel('Text').fill('100 Days, 100 Minutes.\n\n**Join us**.');
}

test('write, preview as people will see it, then send to the audience with a second tap (ADMIN-07, ADMIN-09)', async ({ page }) => {
  const previews = await stubFunction(page, 'adminEmailPreview', PREVIEW);
  const sends = await stubFunction(page, 'adminEmailSend', { id: 'b1', queued: 40 });
  await openEmail(page);

  const send = page.getByRole('button', { name: /Send to|Preview to send/ });
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeDisabled();
  await expect(send).toBeDisabled();
  await page.getByLabel('Away 4 days or more').check();
  await write(page);
  await page.getByLabel('Button label (optional)').fill('Open TikTym');
  await page.getByLabel('Button link').fill('https://app.tiktym.com/');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();

  const expected = { audience: 'away4', subject: 'The challenge starts', title: 'The challenge starts 2 November', body: '100 Days, 100 Minutes.\n\n**Join us**.', button: { label: 'Open TikTym', url: 'https://app.tiktym.com/' } };
  await expect(page.frameLocator('iframe[title="Email preview"]').locator('h1')).toHaveText('The challenge starts 2 November');
  // reading inside the sandboxed preview makes Chrome refuse Playwright's own helper script there; the page itself runs none
  errors = errors.filter(e => !e.includes("Blocked script execution in 'about:srcdoc'"));
  expect(previews).toEqual([{ draft: expected }]);
  await expect(page.getByText('Subject: The challenge starts')).toBeVisible();

  await send.click(); // "Send to up to 42 people…": asks first
  await expect(send).toHaveText('Send to up to 42 people…');
  const confirm = page.getByRole('alertdialog', { name: 'Confirm sending' });
  await expect(confirm).toContainText('This goes to up to 42 people (away 4 days or more)');
  expect(sends).toEqual([]);
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toHaveCount(0);

  await send.click();
  await confirm.getByRole('button', { name: 'Yes, send it' }).click();
  await expect(page.getByRole('status')).toHaveText('Queued for 40 people. It sends 2 a second; History shows how it went.');
  expect(sends).toEqual([{ draft: expected }]);
  await expect(send).toHaveText('Preview to send'); // the same draft can't go out twice by accident
  await expect(send).toBeDisabled();
});

test('changing the draft after a preview needs a new preview before it can be sent (ADMIN-07)', async ({ page }) => {
  await stubFunction(page, 'adminEmailPreview', PREVIEW);
  await openEmail(page);
  await write(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const send = page.getByRole('button', { name: 'Send to up to 42 people…' });
  await expect(send).toBeEnabled();
  await page.getByLabel('Text').fill('Changed.');
  await expect(page.getByRole('button', { name: 'Preview to send' })).toBeDisabled();
  await expect(page.getByText('The draft changed. Preview it again to see it and send it.')).toBeVisible();
});

test('a test goes only to me, and the form says what to fix first (ADMIN-07)', async ({ page }) => {
  const tests = await stubFunction(page, 'adminEmailTest', { to: 'me@example.com' });
  await openEmail(page);
  await page.getByLabel('Subject').fill('Hello');
  await expect(page.getByText('Write a heading.')).toBeVisible();
  await page.getByLabel('Heading').fill('Hi');
  await page.getByLabel('Text').fill('Body');
  await page.getByLabel('Button label (optional)').fill('Open');
  await expect(page.getByText('The button link must start with https://')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send a test to me' })).toBeDisabled();
  await page.getByLabel('Button label (optional)').fill('');
  await page.getByRole('button', { name: 'Send a test to me' }).click();
  await expect(page.getByRole('status')).toHaveText('Test sent to me@example.com.');
  expect(tests).toEqual([{ draft: { audience: 'everyone', subject: 'Hello', title: 'Hi', body: 'Body' } }]);
});

test('a refusal from the server is shown, and nothing is sent (ADMIN-07)', async ({ page }) => {
  await page.route('http://127.0.0.1:5001/demo-tiktym/asia-south1/adminEmailPreview', route => route.fulfill({
    status: 400, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'Fill in the subject, heading and text; a button needs a label and an https link.' } }),
  }));
  await openEmail(page);
  await write(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Fill in the subject, heading and text; a button needs a label and an https link.');
  await expect(page.getByRole('button', { name: 'Preview to send' })).toBeDisabled();
  errors = errors.filter(e => !e.includes('400')); // the browser logs the refused request itself
});
