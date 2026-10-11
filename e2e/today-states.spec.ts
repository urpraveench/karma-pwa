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
    await expect(page.locator('.streak span')).toHaveText('day streak');
    await expect(page.locator('.streak small').first()).toHaveText('best 5');
  });

  test('"days showing up" when there is no streak (TODAY-04)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-01')], [['r', '2026-10-05', 10], ['r', '2026-10-06', 10]]));
    await expect(page.locator('.streak b')).toHaveText('2');
    await expect(page.locator('.streak span')).toHaveText('days showing up');
  });

  test('carried-over pill and row meta (TODAY-07, TODAY-11)', async ({ page }) => {
    await signInWith(page, seedData([reading('2026-10-05')], [['r', '2026-10-05', 30], ['r', '2026-10-06', 20]]));
    await expect(page.locator('.mala-center .big')).toHaveText('40');
    await expect(page.locator('.mala-center .carry')).toHaveText('10 carried over');
    await expect(page.locator('.cat-meta')).toHaveText('0 of 40, 10 carried');
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
