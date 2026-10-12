import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { startWithDefaults } from '../helpers';

// A save Firestore refuses (not just a lost connection, which Firestore queues) must say so. The emulator's rules are
// swapped for ones that refuse writes from accounts named savefails… and reads from accounts named loadfails…,
// so tests running alongside are unaffected.

const RULES_URL = 'http://127.0.0.1:8080/emulator/v1/projects/demo-tiktym:securityRules';
const RULES = readFileSync('firestore.rules', 'utf8');
const OWNER = 'allow read, write: if request.auth != null && request.auth.uid == uid;';
const REFUSING = RULES.replace(OWNER, `allow read: if request.auth != null && request.auth.uid == uid && !request.auth.token.email.matches('loadfails.*');
      allow write: if request.auth != null && request.auth.uid == uid && !request.auth.token.email.matches('savefails.*');`);
const setRules = (request: APIRequestContext, content: string) =>
  request.put(RULES_URL, { data: { rules: { files: [{ name: 'firestore.rules', content }] } } }).then(r => expect(r.ok()).toBe(true));
const toast = (page: import('@playwright/test').Page) => page.locator('.toast span').first();

test.describe.configure({ mode: 'serial' });
test.afterAll(async ({ request }) => { await setRules(request, RULES); });

test('a save Firestore refuses shows "Could not save", after the screen has already updated (SET-18, SYNC-13)', async ({ page, request }) => {
  expect(REFUSING).not.toBe(RULES); // the owner rule is still written as expected
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', `savefails${Date.now()}@test.local`);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  await startWithDefaults(page, { timeout: 15_000 });

  await setRules(request, REFUSING);
  await page.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(page.locator('.cat').nth(1).locator('.cat-meta')).toHaveText('Done, 30 logged'); // optimistic
  await expect(toast(page)).toHaveText('Could not save. Check your connection.', { timeout: 15_000 });

  await page.locator('.tab', { hasText: 'Setup' }).click();
  await page.getByRole('button', { name: 'Move Reading up' }).click();
  await expect(toast(page)).toHaveText('Could not save. Check your connection.', { timeout: 15_000 });
});

test('a refused delete says so too (SYNC-13)', async ({ page, request }) => {
  await setRules(request, RULES);
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', `savefails${Date.now()}@test.local`);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  await startWithDefaults(page, { timeout: 15_000 });
  await page.locator('.cat').nth(1).locator('.qbtn').click();
  await expect(toast(page)).toHaveText('Reading done for today');

  await setRules(request, REFUSING);
  await page.locator('.tab', { hasText: 'History' }).click();
  await page.locator('.log .x').click();
  await expect(page.locator('.log')).toHaveCount(0);
  await expect(toast(page)).toHaveText('Could not save. Check your connection.', { timeout: 15_000 });
});

test('an account whose data can\'t load says so in plain words, with Reload (FIRST-04)', async ({ page, request }) => {
  await setRules(request, REFUSING);
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym', { timeout: 15_000 });
  await page.locator('.link', { hasText: 'Create an account' }).click();
  await page.fill('#em', `loadfails${Date.now()}@test.local`);
  await page.fill('#pw', 'secret123');
  await page.click('button[type=submit]');
  const box = page.locator('.start-err');
  await expect(box).toContainText('Couldn\'t load your practices. Check your connection, then tap Reload.', { timeout: 15_000 });
  await expect(page.locator('.login')).not.toContainText('Firestore');
  await expect(box.getByRole('button', { name: 'Reload' })).toBeVisible();
});
