import { expect, type Page } from '@playwright/test';

/** Wednesday 7 October 2026, 10:00: clear of the month-start, month-end, Monday and weekend moments. */
export const NOW = new Date(2026, 9, 7, 10, 0);

export const DEMO = { email: 'demo@tiktym.local', password: 'tiktym123' };

/** Fixes the clock, accepts confirm()/prompt() dialogs, and opens the login screen. */
export async function open(page: Page, time = NOW) {
  await page.clock.install({ time });
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'DELETE' : undefined));
  await page.goto('/');
  await expect(page.locator('.login h1')).toHaveText('TikTym');
}

export async function signIn(page: Page, time = NOW) {
  await open(page, time);
  await page.fill('#em', DEMO.email);
  await page.fill('#pw', DEMO.password);
  await page.click('button[type=submit]');
  await expect(page.locator('.hello')).toBeVisible();
}

export const toast = (page: Page) => page.locator('.toast span').first();
export const tab = (page: Page, name: string) => page.locator('.tab', { hasText: name });

export async function loadSampleData(page: Page) {
  await tab(page, 'Setup').click();
  await page.locator('.li', { hasText: 'Load sample data' }).click();
  await expect(toast(page)).toHaveText('Sample data loaded');
}
