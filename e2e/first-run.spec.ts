import type { Page } from '@playwright/test';
import { DEMO, expect, open, tab, test, toast } from './helpers';

/** A brand-new account, signed in, on the first-run screen. */
async function toFirstRun(page: Page) {
  await open(page);
  await page.fill('#em', DEMO.email);
  await page.fill('#pw', DEMO.password);
  await page.click('button[type=submit]');
  await expect(page.locator('.fr-title')).toHaveText('What do you want to make time for?');
}
const item = (page: Page, name: string) => page.locator('.fr-item', { hasText: name });
const pick = (page: Page, name: string) => item(page, name).locator('.fr-pick').click();
const startBtn = (page: Page) => page.locator('.fr-start .btn');
const todayNames = (page: Page) => page.locator('.cat .cat-name');

test('a new account sees the choices first; Start right away gives the four defaults (FIRST-01)', async ({ page }) => {
  await toFirstRun(page);
  await expect(page.locator('.fr-item')).toHaveCount(8);
  await expect(page.locator('.fr-pick[aria-pressed="true"] .t')).toHaveText([/^Exercise/, /^Reading/, /^Course study/, /^Meditation/]);
  await expect(item(page, 'Meditation')).toContainText('10 min a day');
  await expect(startBtn(page)).toHaveText('Start with 4 practices');
  await startBtn(page).click();
  await expect(page.locator('.hello')).toBeVisible();
  await expect(todayNames(page)).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation']);
  await expect(page.locator('.cat').nth(3).locator('.cat-meta')).toHaveText('0 of 10');
});

test('ticking and unticking chooses which practices start, in the order shown (FIRST-08)', async ({ page }) => {
  await toFirstRun(page);
  await pick(page, 'Exercise');
  await pick(page, 'Course study');
  await pick(page, 'Coding practice');
  await pick(page, 'Walking');
  await expect(startBtn(page)).toHaveText('Start with 4 practices');
  await startBtn(page).click();
  await expect(todayNames(page)).toHaveText(['Reading', 'Meditation', 'Coding practice', 'Walking']);
  await tab(page, 'Setup').click();
  await expect(page.locator('.list').first().locator('.li .t').first()).toContainText('30 min every day');
});

test('− and + change a practice\'s daily minutes, from 5 up (FIRST-09)', async ({ page }) => {
  await toFirstRun(page);
  await page.getByRole('button', { name: '5 more minutes of Reading' }).click();
  await page.getByRole('button', { name: '5 more minutes of Reading' }).click();
  await expect(item(page, 'Reading')).toContainText('40 min a day');
  await page.getByRole('button', { name: '5 fewer minutes of Meditation' }).click();
  await page.getByRole('button', { name: '5 fewer minutes of Meditation' }).click();
  await expect(item(page, 'Meditation')).toContainText('5 min a day');
  await expect(item(page, 'Coding practice').locator('.fr-mins')).toHaveCount(0); // only ticked ones
  await startBtn(page).click();
  await expect(page.locator('.cat').nth(1).locator('.cat-meta')).toHaveText('0 of 40');
  await expect(page.locator('.cat').nth(3).locator('.cat-meta')).toHaveText('0 of 5');
});

test('add your own, or tick a suggestion by typing its name (FIRST-10)', async ({ page }) => {
  await toFirstRun(page);
  await page.fill('#fr-own', 'Guitar');
  await page.keyboard.press('Enter');
  await expect(item(page, 'Guitar')).toContainText('20 min a day');
  await expect(item(page, 'Guitar').locator('.fr-pick')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#fr-own')).toHaveValue('');
  await page.fill('#fr-own', 'walking');
  await page.click('.fr-own button');
  await expect(page.locator('.fr-item')).toHaveCount(9);
  await expect(item(page, 'Walking').locator('.fr-pick')).toHaveAttribute('aria-pressed', 'true');
  await startBtn(page).click();
  await expect(todayNames(page)).toHaveText(['Exercise', 'Reading', 'Course study', 'Meditation', 'Walking', 'Guitar']);
});

test('with nothing ticked, Start asks you to pick one (FIRST-11)', async ({ page }) => {
  await toFirstRun(page);
  for (const n of ['Exercise', 'Reading', 'Course study', 'Meditation']) await pick(page, n);
  await expect(startBtn(page)).toHaveText('Pick at least one');
  await startBtn(page).click();
  await expect(toast(page)).toHaveText('Pick at least one practice');
  await expect(page.locator('.fr-title')).toBeVisible();
});

test('leaving before Start asks again next time; after Start it never does (FIRST-12)', async ({ page }) => {
  await toFirstRun(page);
  await pick(page, 'Walking');
  await page.reload();
  await expect(page.locator('.fr-title')).toBeVisible();
  await expect(item(page, 'Walking').locator('.fr-pick')).toHaveAttribute('aria-pressed', 'false'); // nothing was saved
  await startBtn(page).click();
  await expect(page.locator('.hello')).toBeVisible();
  await page.reload();
  await expect(page.locator('.hello')).toBeVisible();
  await expect(page.locator('.first-run')).toHaveCount(0);
});
