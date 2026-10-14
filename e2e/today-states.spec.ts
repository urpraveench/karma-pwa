import { ideaFor } from '../src/lib/ideas';
import { at, days, expect, test, seedData, signIn, signInWith, tab, toast } from './helpers';

const reading = (start: string, o = {}) => ({ id: 'r', name: 'Reading', start, ...o });

test.describe('Today states', () => {
  test('greeting by time of day (TODAY-01)', async ({ page }) => {
    await signIn(page, at(14));
    await expect(page.locator('.hello')).toHaveText('Good afternoon, Demo');
  });

  test('evening greeting (TODAY-01)', async ({ page }) => {
    await signIn(page, at(20));
    await expect(page.locator('.hello')).toHaveText('Good evening, Demo');
  });

  test('streak badge, with best when it is higher (TODAY-03)', async ({ page }) => {
    // best run of 5 (26–30 Sep, earning a shield), misses on 1 Oct (shielded) and 2 Oct (breaks it) paid back on 3 Oct, then 3 clear days
    const logs = [...days('2026-09-26', '2026-09-30').map(d => ['r', d, 30] as const), ['r', '2026-10-03', 90] as const,
      ...days('2026-10-04', '2026-10-06').map(d => ['r', d, 30] as const)];
    await signInWith(page, seedData([reading('2026-09-26')], logs.map(l => [...l])));
    await expect(page.locator('.streak b')).toHaveText('4');
    await expect(page.locator('.streak > span')).toHaveText('day streak');
    await expect(page.locator('.streak small').first()).toHaveText('best 5');
  });

  test('"days showing up" when there is no streak (TODAY-04)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-01')], [['r', '2026-10-05', 10], ['r', '2026-10-06', 10]]));
    await expect(page.locator('.streak b')).toHaveText('2');
    await expect(page.locator('.streak > span')).toHaveText('days showing up');
  });

  test('carried-over pill and row meta (TODAY-07, TODAY-11)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-05')], [['r', '2026-10-05', 30], ['r', '2026-10-06', 20]]));
    await expect(page.locator('.mala-center .big')).toHaveText('40');
    await expect(page.locator('.mala-center .carry')).toHaveText('10 carried over');
    await expect(page.locator('.cat-meta')).toHaveText('0 of 30, 10 carried');
  });

  test('the coloured button logs only today\'s minutes, then a red button clears the backlog (LOG-01, LOG-32, TODAY-11)', async ({ page }) => {
    // Exercise 60 a day, missed on 5 and 6 Oct: 60 due today and 120 carried, as in the user's report
    const ex = { id: 'e', name: 'Exercise', start: '2026-10-05', minutes: 60 };
    await signInWith(page, seedData([ex, { id: 'm', name: 'Meditation', start: '2026-10-07', minutes: 10 }]));
    const row = page.locator('.cat').nth(0);
    await expect(row.locator('.cat-meta')).toHaveText('0 of 60, 120 carried');
    await expect(row.locator('.qbtn')).toHaveText('+60');
    await expect(page.locator('.row-hint')).toContainText("The coloured button logs today's minutes.");
    await row.locator('.qbtn').click();
    await expect(toast(page)).toHaveText("Today's Exercise done, 120 carried left");
    await expect(row.locator('.cat-meta')).toHaveText("Today's 60 done, 120 carried");
    await expect(page.locator('.mala-center .carry')).toHaveText('120 carried over');
    const carry = row.locator('.qbtn.carry');
    await expect(carry).toHaveText('+120carried');
    await expect(carry).toHaveAttribute('aria-label', 'Log 120 carried-over minutes of Exercise');
    await carry.click();
    await expect(toast(page)).toHaveText('Exercise done for today');
    await expect(row.locator('.cat-meta')).toHaveText('Done, 180 logged');
    await expect(row.locator('.qbtn.done')).toBeVisible();
  });

  test('a day with no target but a backlog shows only what is carried (TODAY-11)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-05', { days: [1] })])); // Mondays only: 5 Oct missed, nothing due today
    await expect(page.locator('.cat-meta')).toHaveText('30 carried');
    await expect(page.locator('.cat .qbtn.carry')).toHaveText('+30carried');
  });

  test('rest day when nothing is scheduled (TODAY-09)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-01', { days: [1] })], [['r', '2026-10-05', 30]]));
    await expect(page.locator('.mala-center .clear-word')).toHaveText('Rest day');
    await expect(page.locator('.cat-meta')).toHaveText('Rest day');
  });

  test('archived practices are not on Today (TODAY-12)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-01'), { id: 'x', name: 'Old', start: '2026-10-01', archivedFrom: '2026-10-03' }], [['r', '2026-10-06', 30]]));
    await expect(page.locator('.cat .cat-name')).toHaveText(['Reading']);
  });

  test('streak nudge after 6 pm (TODAY-13)', async ({ page }) => {
    const data = seedData([reading('2026-10-03')], [['r', '2026-10-03', 30], ['r', '2026-10-05', 60], ['r', '2026-10-06', 30]]);
    await signInWith(page, data, at(19));
    await expect(page.locator('.moment')).toHaveCount(0);
    await expect(page.locator('.nudge')).toHaveText('Clear 30 more to keep your 2-day streak');
  });

  test('no nudge before 6 pm (TODAY-13)', async ({ page }) => {
    const data = seedData([reading('2026-10-03')], [['r', '2026-10-03', 30], ['r', '2026-10-05', 60], ['r', '2026-10-06', 30]]);
    await signInWith(page, data, at(17));
    await expect(page.locator('.nudge')).toHaveCount(0);
  });

  test('a held shield shows on the badge and in the evening nudge (TODAY-17)', async ({ page }) => {
    // 30 Sep to 6 Oct clear: seven days, so two shields
    await signInWith(page, seedData([reading('2026-09-30')], days('2026-09-30', '2026-10-06').map(d => ['r', d, 30])), at(19));
    await expect(page.locator('.streak b')).toHaveText('7');
    await expect(page.locator('.streak .shields')).toHaveText('2 shields');
    await page.click('.m-x'); // the "On a roll" card
    await expect(page.locator('.nudge')).toHaveText('Clear 30 more to keep your 7-day streak without using a shield');
  });

  test('the day after a shield is spent, Today says so (TODAY-17)', async ({ page }) => {
    // 3 to 5 Oct clear earns a shield; 6 Oct missed spends it
    await signInWith(page, seedData([reading('2026-10-03')], days('2026-10-03', '2026-10-05').map(d => ['r', d, 30])), at(19));
    await expect(page.locator('.streak b')).toHaveText('3');
    await expect(page.locator('.streak .shields')).toHaveCount(0);
    await expect(page.locator('.nudge')).toHaveText('A shield kept your 3-day streak yesterday.');
    // good news, so gold with a shield, not the red warning style
    await expect(page.locator('.nudge')).toHaveClass(/good/);
    await expect(page.locator('.nudge svg')).toBeVisible();
    expect(await page.locator('.nudge').evaluate(e => getComputedStyle(e).color)).not.toBe(await page.locator('.carry').evaluate(e => getComputedStyle(e).color));
  });

  test('"Just 7 minutes" starts a short timer on the easiest practice, until something is logged (TODAY-18)', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.just7')).toHaveCount(0); // the "Start small" card offers its own start
    await page.click('.m-x');
    await expect(page.locator('.just7')).toHaveText('Just 7 minutes of Meditation');
    await page.click('.just7');
    await expect(page.locator('.focus .f-name')).toHaveText('Meditation');
    await expect(page.locator('.f-goal .chip[aria-pressed=true]')).toHaveText('7');
    await expect(page.locator('.just7')).toHaveCount(0);
  });

  test('"Just 7 minutes" is gone once something is logged today (TODAY-18)', async ({ page }) => {
    await signIn(page);
    await page.click('.m-x');
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await expect(page.locator('.just7')).toHaveCount(0);
  });

  test('focus timer tip shows once the moment is hidden, and stays dismissed (TODAY-14)', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.tip')).toHaveCount(0); // the "Start small" card is showing
    await page.click('.m-x');
    await expect(page.locator('.tip')).toContainText('Try a focus timer.');
    await page.click('.tip .x');
    await expect(page.locator('.tip')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.tip')).toHaveCount(0);
  });

  test('mala beads take the practice colour and animate in once (TODAY-05, TODAY-06)', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.mala.intro')).toHaveCount(1);
    await page.locator('.cat').nth(0).locator('.qbtn').click(); // 30 of 100 owed → 32 of 108 beads
    await expect(page.locator('.mala circle.bd[fill="#1F8A70"]')).toHaveCount(32);
    await expect(page.locator('.mala circle.bd[fill="var(--line)"]')).toHaveCount(76);
    await page.clock.fastForward(2000);
    await expect(page.locator('.mala.intro')).toHaveCount(0);
  });

  test('clearing everything: Undo from the celebration (LOG-04)', async ({ page }) => {
    await signIn(page);
    for (let i = 0; i < 4; i++) await page.locator('.cat .qbtn:not(.done)').first().click();
    await page.locator('.celebrate button', { hasText: 'Undo last entry' }).click();
    await expect(page.locator('.celebrate')).toHaveCount(0);
    await expect(page.locator('.mala-center .big')).toHaveText('10');
  });

  test("this week's days under the streak; tapping it opens the Streak sheet (TODAY-20)", async ({ page }) => {
    // 30 Sep to 6 Oct clear: a 7-day streak and two shields; today (Wednesday 7 Oct) not cleared yet
    await signInWith(page, seedData([reading('2026-09-30')], days('2026-09-30', '2026-10-06').map(d => ['r', d, 30])), at(19));
    await expect(page.locator('.streak .week-dots i')).toHaveCount(7);
    expect(await page.locator('.streak .week-dots i').evaluateAll(x => x.map(e => e.className))).toEqual(['clear', 'clear', 'today', 'future', 'future', 'future', 'future']);
    await page.locator('button.streak').click();
    const sheet = page.getByRole('dialog', { name: 'Streak' });
    await expect(sheet.locator('.sk-head')).toHaveText('7day streak');
    await expect(sheet.locator('.sk-shields .held')).toHaveCount(2);
    await expect(sheet.locator('.sk-shields')).toHaveAttribute('aria-label', '2 of 3 shields');
    await expect(sheet.locator('.sk-next')).toHaveText('2 more clear days in a row earn a shield.');
    await expect(sheet.locator('.sk-month h3')).toHaveText('October 2026');
    await expect(sheet.getByLabel('6 October: clear')).toBeVisible();
    await expect(sheet.getByLabel('7 October: today, not clear yet')).toBeVisible();
    await expect(sheet.getByLabel('Next month')).toBeDisabled();
    // September holds the first day; nothing before it
    await sheet.getByLabel('Previous month').click();
    await expect(sheet.locator('.sk-month h3')).toHaveText('September 2026');
    await expect(sheet.getByLabel('30 September: clear')).toBeVisible();
    await expect(sheet.getByLabel('Previous month')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });

  test('the Streak sheet shows the level: a new account at Level 1, with its rules (TODAY-22, TODAY-20, LVL-03, LVL-06, LVL-07)', async ({ page }) => {
    // levels begin Monday 19 October; this account starts that day and meets its target on 19 and 20 October
    await signInWith(page, seedData([reading('2026-10-19')], [['r', '2026-10-19', 30], ['r', '2026-10-20', 30]]), at(10, 0, 21));
    await page.locator('button.streak').click();
    const sheet = page.getByRole('dialog', { name: 'Streak' });
    await expect(sheet.locator('.sk-lv')).toHaveText('Level 1 · Starting');
    await expect(sheet.locator('.sk-lv-text')).toHaveText('100% of your practice days on target in the last 14 days. Reach 15% and on Monday 2 November you move up to Level 2.');
    // Level 1's rules: a shield to start, one more every 2 clear days, up to 5 (LVL-06, LVL-07)
    await expect(sheet.locator('.sk-shields')).toHaveAttribute('aria-label', '2 of 5 shields');
    await expect(sheet.locator('.sk-next')).toHaveText('2 more clear days in a row earn a shield.');
    await expect(sheet.locator('.sk-how')).toHaveText('At Level 1: A day is clear when you do 5 minutes or more on any practice. Every 2 clear days in a row earn a shield, and you can hold 5. Miss a day and a shield keeps your streak; the minutes still carry over.');
  });

  test('the Streak sheet shows the level: a consistent account starts at Level 10, with its rules (TODAY-22, TODAY-20, LVL-04, LVL-07)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-09-14')], days('2026-09-14', '2026-10-20').map(d => ['r', d, 30])), at(10, 0, 21));
    await page.locator('button.streak').click();
    const sheet = page.getByRole('dialog', { name: 'Streak' });
    await expect(sheet.locator('.sk-lv')).toHaveText('Level 10 · Relentless');
    await expect(sheet.locator('.sk-lv-text')).toHaveText('100% of your practice days on target in the last 14 days. Stay at 83% or more to keep Level 10.');
    // Level 10 holds one shield: the 3 held before levels began are trimmed (LVL-07)
    await expect(sheet.locator('.sk-shields')).toHaveAttribute('aria-label', '1 of 1 shield');
    await expect(sheet.locator('.sk-next')).toHaveText('You hold your shield, the most you can at this level.');
    await expect(sheet.locator('.sk-how')).toHaveText('At Level 10: A day is clear when every practice is done, carried-over minutes included. Every 7 clear days in a row earn a shield, and you can hold 1. Miss a day and a shield keeps your streak; the minutes still carry over.');
  });

  test('the coach speaks to the level: the on-a-roll card at Level 1 (COACH-04, MOM-08)', async ({ page }) => {
    // 6 clear days to 20 October; under a week of history when levels began, so Level 1, where 5 minutes keeps the streak
    await signInWith(page, seedData([reading('2026-10-15')], days('2026-10-15', '2026-10-20').map(d => ['r', d, 30])), at(10, 0, 21));
    await expect(page.locator('.moment .m-title')).toHaveText('Day 7 is waiting.');
    await expect(page.locator('.moment .m-body')).toHaveText("6 days in a row. 5 minutes keeps it going. That's all it takes.");
  });

  test('no level before levels began (TODAY-22)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-09-30')], days('2026-09-30', '2026-10-06').map(d => ['r', d, 30])));
    await page.locator('button.streak').click();
    await expect(page.getByRole('dialog', { name: 'Streak' }).locator('.sk-level')).toHaveCount(0);
  });

  test('the Streak sheet marks the day a shield saved, and missed days (TODAY-20)', async ({ page }) => {
    // 1–3 Oct clear earns a shield; 4 Oct missed spends it; 5 Oct pays it back; 6 Oct missed with no shield left
    await signInWith(page, seedData([reading('2026-10-01')], [...days('2026-10-01', '2026-10-03').map(d => ['r', d, 30] as [string, string, number]), ['r', '2026-10-05', 60]]), at(10));
    // no streak and no run of showing up, so no badge on Today: the way in is Insights › Consistency
    await expect(page.locator('.streak')).toHaveCount(0);
    await tab(page, 'Insights').click();
    await page.getByRole('button', { name: 'best streak 4 ›' }).click();
    const sheet = page.getByRole('dialog', { name: 'Streak' });
    await expect(sheet.locator('.sk-head')).toHaveText('0day streak · best 4');
    await expect(sheet.getByLabel('4 October: missed, a shield kept the streak').locator('svg')).toBeVisible();
    await expect(sheet.getByLabel('6 October: missed')).toBeVisible();
    await expect(sheet.locator('.sk-shields .held')).toHaveCount(0);
  });

  test('streak milestone in the celebration (LOG-05)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-01')], days('2026-10-01', '2026-10-06').map(d => ['r', d, 30])));
    await page.locator('.cat .qbtn').click();
    await expect(page.locator('.celebrate p')).toHaveText('7-day streak. A full week.');
  });

  test('three clear days earn a shield in the celebration (LOG-05, CALC-14)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-05')], [['r', '2026-10-05', 30], ['r', '2026-10-06', 30]]));
    await page.locator('.cat .qbtn').click();
    await expect(page.locator('.celebrate p')).toHaveText('3-day streak. You earned a shield: it keeps your streak if you miss a day.');
  });

  test("today's idea, a new one each day (TODAY-19)", async ({ page }) => {
    await signIn(page, at(23, 59));
    await expect(page.locator('.idea p')).toHaveText(ideaFor('2026-10-07'));
    await page.clock.fastForward('02:00');
    await expect(page.locator('.idea p')).toHaveText(ideaFor('2026-10-08'));
  });

  test('the day rolls over at midnight (APP-09)', async ({ page }) => {
    await signIn(page, at(23, 59));
    await page.locator('.cat').nth(0).locator('.qbtn').click();
    await expect(page.locator('.date')).toHaveText('Wednesday 7 October');
    await page.clock.fastForward('02:00');
    await expect(page.locator('.date')).toHaveText('Thursday 8 October');
    await expect(page.locator('.cat').nth(0).locator('.cat-meta')).toHaveText('0 of 30');
  });
});

test.describe('Moments in the app', () => {
  test('the card button starts a timer with the suggested goal (MOM-11, TIMER-04)', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.m-cta')).toHaveText('Start 10 min of Meditation');
    await page.click('.m-cta');
    await expect(page.locator('.focus .f-name')).toHaveText('Meditation');
    await expect(page.locator('.f-goal .chip[aria-pressed=true]')).toHaveText('10 (all left)');
    await page.click('.f-min');
    await expect(page.locator('.m-cta')).toHaveCount(0); // hidden while a timer runs
  });

  test('comeback: minimum mode until the minimum is met (MOM-13, TODAY-10)', async ({ page }) => {
    const cats = [{ id: 'r', name: 'Reading', start: '2026-09-20' }, { id: 'm', name: 'Meditation', minutes: 10, start: '2026-09-20' }];
    await signInWith(page, seedData(cats, [['r', '2026-10-01', 30]]));
    await expect(page.locator('.moment .m-title')).toHaveText('Welcome back, Demo.');
    await expect(page.locator('.mala-center .big')).toHaveText('10');
    await expect(page.locator('.mala-center .lbl')).toHaveText('minutes to make today count');
    await page.locator('.cat').nth(1).locator('.cat-open').click();
    await page.locator('.tile', { hasText: /^10$/ }).click();
    await expect(toast(page)).toHaveText('Today counts. Anything more is a bonus.');
  });

  test('a hidden card stays hidden when switching tabs (MOM-12)', async ({ page }) => {
    await signIn(page);
    await page.click('.m-x');
    await expect(page.locator('.moment')).toHaveCount(0);
    await tab(page, 'Insights').click();
    await tab(page, 'Today').click();
    await expect(page.locator('.moment')).toHaveCount(0);
  });
});

test.describe('the morning splash (TODAY-21)', () => {
  test.use({ ideaSplash: true });

  test("today's idea on the first open of the day, then Today; not again that day; again tomorrow", async ({ page }) => {
    const data = seedData([reading('2026-10-01')], [['r', '2026-10-06', 30]]);
    await signInWith(page, data);
    const splash = page.getByRole('dialog', { name: "Today's idea" });
    await expect(splash).toBeVisible();
    await expect(splash.locator('.splash-idea')).toHaveText(ideaFor('2026-10-07'));
    await expect(splash.locator('.splash-date')).toHaveText('Wednesday 7 October');
    await expect(splash.getByRole('button', { name: 'Start my day' })).toBeFocused();
    await splash.getByRole('button', { name: 'Start my day' }).click();
    await expect(splash).toHaveCount(0);
    await expect(page.locator('.hello')).toBeVisible();
    await page.reload();
    await expect(page.locator('.hello')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(splash).toHaveCount(0);
    // the next morning
    await page.clock.setSystemTime(new Date(2026, 9, 8, 8, 0));
    await page.reload();
    await expect(splash.locator('.splash-idea')).toHaveText(ideaFor('2026-10-08'));
  });

  test('closes by itself after a few seconds, or with a tap anywhere', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-01')]));
    const splash = page.getByRole('dialog', { name: "Today's idea" });
    await expect(splash).toBeVisible();
    await page.clock.fastForward(7500);
    await expect(splash).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('tiktym:idea-seen'));
    await page.reload();
    await splash.locator('.splash-idea').click();
    await expect(splash).toHaveCount(0);
  });

  test('not on the day the account starts: choosing practices comes first', async ({ page }) => {
    await signIn(page);
    await page.waitForTimeout(300);
    await expect(page.getByRole('dialog', { name: "Today's idea" })).toHaveCount(0);
  });
});
