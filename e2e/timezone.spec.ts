import { expect, signIn, tab, test } from './helpers';

// Days follow the phone's own time zone, not UTC: each moment below is on a different date in UTC.
const CASES = [
  { zone: 'America/Los_Angeles', at: '2026-10-08T05:30:00Z', heading: 'Wednesday 7 October', day: '2026-10-07' }, // 22:30 on the 7th
  { zone: 'Asia/Kolkata', at: '2026-10-07T19:00:00Z', heading: 'Thursday 8 October', day: '2026-10-08' }, // 00:30 on the 8th
];

for (const c of CASES) {
  test.describe(c.zone, () => {
    test.use({ timezoneId: c.zone });

    test(`today and new entries use the local date (APP-11)`, async ({ page }) => {
      await signIn(page, new Date(c.at));
      await expect(page.locator('.top .date')).toHaveText(c.heading);
      await page.locator('.cat').nth(1).locator('.qbtn').click();
      await tab(page, 'History').click();
      await expect(page.locator('.day-h span')).toHaveText(['Today']);
      const dates = await page.evaluate(() => {
        const key = Object.keys(localStorage).find(k => k.startsWith('tiktym:data:'))!;
        return (JSON.parse(localStorage.getItem(key)!).logs as { date: string }[]).map(l => l.date);
      });
      expect(dates).toEqual([c.day]);
    });
  });
}
