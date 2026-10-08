import type { Page } from '@playwright/test';
import { expect, loadSampleData, signIn, tab, test } from './helpers';

// The shareable progress card, with sample data, on the fixed test date (7 October 2026).
async function openShare(page: Page) {
  await signIn(page);
  await loadSampleData(page);
  await tab(page, 'Insights').click();
  await page.locator('.share-btn').click();
  await expect(page.locator('.card-preview img')).toBeVisible();
}

test('Insights › Share previews a 1080×1350 card (SHARE-02)', async ({ page }) => {
  await openShare(page);
  const img = page.locator('.card-preview img');
  expect(await img.evaluate(i => [(i as HTMLImageElement).naturalWidth, (i as HTMLImageElement).naturalHeight])).toEqual([1080, 1350]);
  await expect(img).toHaveAttribute('alt', /^October so far: .+ of learning and practice, \d+ (day streak|day best streak|entr(y|ies) this month), \d+ active days\. Top: .+\.$/);
});

test('the names switch hides practice names (SHARE-04)', async ({ page }) => {
  await openShare(page);
  const img = page.locator('.card-preview img');
  await expect(img).toHaveAttribute('alt', /Exercise|Reading|Course study|Meditation/);
  const before = await img.getAttribute('src');
  await page.locator('.li.toggle').click();
  await expect(page.locator('.li.toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(img).not.toHaveAttribute('src', before!); // redrawn
  await expect(img).toHaveAttribute('alt', /Practice 1/);
  await expect(img).not.toHaveAttribute('alt', /Exercise|Reading|Course study|Meditation/);
});

test("Share hands the phone's share sheet a PNG (SHARE-03)", async ({ page }) => {
  await page.addInitScript(() => {
    const nav = navigator as Navigator & { __shared?: unknown };
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d: ShareData) => {
      const f = d.files![0];
      (window as unknown as { __shared: unknown }).__shared = { name: f.name, type: f.type, size: f.size, title: d.title };
      void nav; return Promise.resolve();
    } });
  });
  await openShare(page);
  await page.locator('.sheet .btn', { hasText: /^Share$/ }).click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: { name: string; type: string; size: number; title: string } }).__shared);
  expect(shared).toMatchObject({ name: 'tiktym-progress-2026-10.png', type: 'image/png', title: 'My TikTym progress' });
  expect(shared.size).toBeGreaterThan(10_000);
});

test('without image sharing, Download saves the PNG (SHARE-03)', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  await openShare(page);
  await expect(page.locator('.sheet .btn', { hasText: /^Share$/ })).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.sheet .btn', { hasText: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('tiktym-progress-2026-10.png');
});

test('no Share button before anything is logged', async ({ page }) => {
  await signIn(page);
  await tab(page, 'Insights').click();
  await expect(page.locator('.share-btn')).toHaveCount(0);
});
