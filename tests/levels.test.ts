import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { addDays } from '../src/lib/date';
import { dayState, keepLeft, levelText, levelFor, levelOn, levels, minimumOf, nextMonday, practiceStreak, score, tierOf } from '../src/lib/levels';
import type { DayRow } from '../src/lib/backlog';
import { moment } from '../src/lib/moments';
import { buildInsights } from '../src/lib/insights';
import type { AppData, Category, Log } from '../src/lib/types';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const FROM = '2026-10-05'; // a Monday: levels begin
const cat = (id: string, start: string, o: Partial<Category> = {}): Category => ({
  id, name: id, color: '#000', order: 0, startDate: start, archivedFrom: null, targets: [{ from: start, minutes: 10, days: EVERY_DAY }], ...o,
});
let n = 0;
/** One entry of `minutes` on each day from `from` to `to` that `keep` allows. */
const logs = (catId: string, from: string, to: string, minutes = 10, keep = (_i: number) => true): Log[] => {
  const out: Log[] = [];
  for (let d = from, i = 0; d <= to; d = addDays(d, 1), i++) if (keep(i)) out.push({ id: 'l' + n++, catId, date: d, minutes, note: '', createdAt: 0 });
  return out;
};
const data = (categories: Category[], l: Log[] = []): AppData => ({ categories, logs: l, settings: { backlogCap: 0 } });
const lv = (d: AppData, asOf: string) => levels(calc(d, asOf), d.categories, asOf, FROM);

describe('levels', () => {
  it('ten levels in five tiers, each with a threshold (LVL-01)', () => {
    expect([0, 14, 15, 24, 25, 54, 55, 92, 93, 100].map(levelFor)).toEqual([1, 1, 2, 2, 3, 5, 6, 9, 10, 10]);
    expect([1, 2, 3, 6, 7, 10].map(tierOf)).toEqual(['Starting', 'Starting', 'Building', 'Steady', 'Strong', 'Relentless']);
  });

  it("scores the share of practice-days on target (80% of it or more), ignoring the backlog and days with nothing due (LVL-02)", () => {
    const weekdays = cat('w', '2026-09-28', { targets: [{ from: '2026-09-28', minutes: 10, days: [1, 2, 3, 4, 5] }] });
    // 28 Sep to 4 Oct: daily practice met on 4 of 7 days; weekday practice met on 3 of its 5 days (the weekend owes nothing)
    const d = data([cat('a', '2026-09-28'), weekdays], [...logs('a', '2026-09-28', '2026-10-01'), ...logs('w', '2026-09-30', '2026-10-02')]);
    const c = calc(d, '2026-10-04');
    expect(score(c, d.categories, '2026-09-28', '2026-10-04')).toBe(58); // 7 of 12
    // a day whose target is met counts, even with carried-over minutes still owed
    const owed = data([cat('a', '2026-09-28')], logs('a', '2026-09-29', '2026-09-29'));
    expect(score(calc(owed, '2026-09-29'), owed.categories, '2026-09-29', '2026-09-29')).toBe(100);
    expect(score(c, d.categories, '2026-09-20', '2026-09-27')).toBeNull();
    // 80% of a target counts; less doesn't
    const near = data([cat('a', '2026-09-28')], [...logs('a', '2026-09-28', '2026-09-28', 8), ...logs('a', '2026-09-29', '2026-09-29', 7)]);
    expect(score(calc(near, '2026-09-29'), near.categories, '2026-09-28', '2026-09-29')).toBe(50);
  });

  it('a new account starts at Level 1, and there are no levels before they began (LVL-03)', () => {
    const d = data([cat('a', '2026-10-07')], logs('a', '2026-10-07', '2026-10-09'));
    expect(lv(d, '2026-10-09')).toMatchObject({ level: 1, moves: [{ date: '2026-10-07', level: 1 }] });
    expect(lv(data([cat('a', '2026-09-01')]), '2026-10-04')).toBeNull();
  });

  it("an existing account starts from its last 28 days (LVL-04)", () => {
    const perfect = data([cat('a', '2026-08-01')], logs('a', '2026-08-01', '2026-10-04'));
    expect(lv(perfect, FROM)!.level).toBe(10);
    const half = data([cat('a', '2026-08-01')], logs('a', '2026-09-07', '2026-10-04', 10, i => i % 2 === 0)); // 14 of the last 28
    expect(lv(half, FROM)!.level).toBe(5);
    const fresh = data([cat('a', '2026-10-01')], logs('a', '2026-10-01', '2026-10-04')); // 4 days of history: too few to judge
    expect(lv(fresh, FROM)!.level).toBe(1);
  });

  it('each Monday moves one level at most, up at the next threshold and down 10 points under the current one (LVL-05)', () => {
    // every target met from the start: the first check needs 14 days, then one step a week
    const steady = data([cat('a', FROM)], logs('a', FROM, '2026-11-15'));
    expect(lv(steady, '2026-10-18')!.level).toBe(1);
    expect(lv(steady, '2026-10-19')!.moves).toEqual([{ date: FROM, level: 1 }, { date: '2026-10-19', level: 2 }]);
    expect(lv(steady, '2026-11-09')!.level).toBe(5);
    // Level 10, then a week off: 50% falls under 83 (one step), then 0% (one more step)
    const stop = data([cat('a', '2026-08-01')], logs('a', '2026-08-01', '2026-10-04'));
    expect(lv(stop, '2026-10-12')!.level).toBe(9);
    expect(lv(stop, '2026-10-19')!.level).toBe(8);
    // Level 10 at 86%: under its 93% threshold, but not 10 points under, so it stays; at 79% it moves down
    const before = logs('a', '2026-08-01', '2026-10-04');
    const dip = data([cat('a', '2026-08-01')], [...before, ...logs('a', FROM, '2026-10-11', 10, i => i < 5)]); // 5 of 7 after 7 of 7: 86%
    expect(lv(dip, '2026-10-12')).toMatchObject({ level: 10, score: 86 });
    const drop = data([cat('a', '2026-08-01')], [...before, ...logs('a', FROM, '2026-10-11', 10, i => i < 4)]); // 4 + 7 of 14: 79%
    expect(lv(drop, '2026-10-12')).toMatchObject({ level: 9, score: 79 });
    // nothing due in the window: no move
    const archived = data([cat('a', '2026-08-01', { archivedFrom: FROM })], logs('a', '2026-08-01', '2026-10-04'));
    expect(lv(archived, '2026-11-02')!.level).toBe(10);
  });

  it('the next check is the coming Monday, and the score covers the last 14 days (TODAY-22)', () => {
    expect(nextMonday('2026-10-07')).toBe('2026-10-12');
    expect(nextMonday('2026-10-12')).toBe('2026-10-19');
    const d = data([cat('a', FROM)], logs('a', FROM, '2026-10-11', 10, i => i < 4)); // 4 of 7 days so far
    expect(lv(d, '2026-10-12')).toMatchObject({ score: 57, nextCheck: '2026-10-19' });
    expect(lv(d, FROM)!.nextCheck).toBe('2026-10-19'); // 12 October has only a week behind it
  });

  const row = (due: number, done: number, opening = 0): DayRow => ({ date: '2026-10-07', due, done, opening, owed: opening + due, end: Math.max(0, opening + due - done) });

  it('what makes a clear day at each level (LVL-06)', () => {
    expect([10, 20, 30, 60, 3].map(minimumOf)).toEqual([5, 10, 15, 15, 3]);
    const day = [row(30, 4), row(10, 0, 20)]; // 4 of 30 on one practice, nothing on another that carries 20
    expect(dayState('any5', day)).toBe('miss');
    expect(dayState('any5', [row(30, 5), row(10, 0, 20)])).toBe('clear');
    expect(dayState('minimum', [row(30, 14), row(10, 5, 20)])).toBe('clear'); // 5 is the 10-minute practice's minimum
    expect(dayState('half', [row(30, 20), row(10, 0, 20)])).toBe('clear'); // 20 of 40
    expect(dayState('most', [row(30, 20), row(10, 0, 20)])).toBe('miss'); // 30 needed
    expect(dayState('targets', [row(30, 30), row(10, 10, 20)])).toBe('clear'); // the 20 carried can wait
    expect(dayState('all', [row(30, 30), row(10, 10, 20)])).toBe('miss');
    expect(dayState('half', [row(0, 0, 20)])).toBe('rest'); // only carried minutes: nothing due at a lower level
    expect(dayState('all', [row(0, 0, 20)])).toBe('miss');
  });

  it('minutes still needed to keep the streak today, by level (TODAY-13)', () => {
    const day = [row(30, 10), row(10, 0, 20)];
    expect(['any5', 'minimum', 'half', 'most', 'targets', 'all'].map(r => keepLeft(r as never, day))).toEqual([0, 5, 10, 20, 30, 50]);
  });

  it('shields by level: a new account starts with one, earns one every 2 clear days at Level 1, and holds 5 (LVL-07)', () => {
    const d = data([cat('a', FROM)], logs('a', FROM, '2026-10-16', 5)); // 5 of 10 minutes a day: clear at Level 1, never a full target
    const c = calc(d, '2026-10-16', FROM);
    expect(c.level!.level).toBe(1);
    expect(c.streak).toBe(12);
    expect(c.shields).toBe(5); // 1 to start + 1 every 2 days, capped at 5
    expect(c.rule).toMatchObject({ clear: 'any5', shieldDays: 2, shieldMax: 5 });
    const missed = calc(data([cat('a', FROM)], logs('a', FROM, '2026-10-16', 5, i => i !== 1)), '2026-10-16', FROM);
    expect(missed.shielded).toEqual(['2026-10-06']); // the starting shield kept the streak on day two
    expect(missed.streak).toBe(11);
  });

  it('a level that holds fewer shields trims the extra; days before levels keep the old rules (LVL-07, LVL-08)', () => {
    const perfect = data([cat('a', '2026-08-01')], logs('a', '2026-08-01', '2026-10-06'));
    expect(calc(perfect, '2026-10-04', FROM)).toMatchObject({ level: null, shields: 3, rule: { shieldMax: 3 } });
    const c = calc(perfect, '2026-10-06', FROM);
    expect(c.level!.level).toBe(10);
    expect(c.shields).toBe(1);
    expect(levelOn(c.level, '2026-10-04')).toBe(6);
    // at Level 6 a day before levels with only half done was a miss; a Level 1 account can't rewrite it
    const half = data([cat('a', '2026-10-01')], logs('a', '2026-10-01', '2026-10-06', 5));
    const h = calc(half, '2026-10-06', FROM);
    expect(h.level!.level).toBe(1);
    expect([...h.days.entries()].filter(([d]) => d < FROM).map(([, v]) => v)).toEqual(['miss', 'miss', 'miss', 'miss']);
  });

  it('a practice streak survives the misses its level allows (LVL-09)', () => {
    const streak = (keep: (i: number) => boolean, asOf: string, start = FROM) => {
      const d = data([cat('a', start)], logs('a', start, asOf, 10, keep));
      const c = calc(d, asOf, FROM);
      return practiceStreak(c.per.a.byDate, c.level, asOf);
    };
    // Level 1 (5 Oct to 18 Oct): 2 misses in any 7 days are fine, a 3rd ends it
    expect(streak(i => i !== 3 && i !== 5, '2026-10-18')).toBe(12);
    expect(streak(i => i !== 3 && i !== 5 && i !== 7, '2026-10-18')).toBe(8); // misses on 12 and 10 Oct are allowed; 8 Oct is a 3rd in 7 days
    // before levels (Level 6 rules), one miss ends it, even when paid back the next day
    const old = data([cat('a', '2026-09-21')], [...logs('a', '2026-09-21', '2026-10-04', 10, i => i !== 3), ...logs('a', '2026-09-25', '2026-09-25')]);
    const oc = calc(old, '2026-10-04', FROM);
    expect(practiceStreak(oc.per.a.byDate, oc.level, '2026-10-04')).toBe(10); // 25 Sep to 4 Oct
    // today not done yet doesn't end it
    expect(streak(i => i < 13, '2026-10-18')).toBe(13);
  });

  it('the backlog limit follows the level unless one was picked (LVL-10)', () => {
    const owed = (settings: AppData['settings'], asOf: string) => calc({ categories: [cat('a', '2026-08-01')], logs: logs('a', '2026-08-01', '2026-10-04'), settings }, asOf, FROM).per.a.today.opening;
    // Level 10 from 5 Oct: no limit, so a week off carries every day of it
    expect(owed({}, '2026-10-12')).toBe(70);
    expect(owed({ backlogCap: -1 }, '2026-10-12')).toBe(70);
    expect(owed({ backlogCap: 2 }, '2026-10-12')).toBe(20); // the picked limit wins
    // before levels, 2 days as always
    expect(owed({}, '2026-10-04')).toBe(0);
    const before = calc({ categories: [cat('a', '2026-09-01')], logs: [], settings: {} }, '2026-09-10', FROM).per.a.today.opening;
    expect(before).toBe(20);
  });

  const card = (d: AppData, asOf: string, hour = 10) => moment(calc(d, asOf, FROM), { data: d, user: null, hidden: null, now: new Date(`${asOf}T${String(hour).padStart(2, '0')}:00`) });

  it('a card introduces the level to an existing account the day levels begin and the next (LVL-11)', () => {
    const d = data([cat('a', '2026-08-01')], logs('a', '2026-08-01', '2026-10-06'));
    expect(card(d, FROM)).toMatchObject({ key: 'level', title: 'Meet your level: 10 · Relentless.' });
    expect(card(d, FROM)!.body).toMatch(/^Worked out from your last 4 weeks\. It moves each Monday with how often you hit your targets\. A day is clear when/);
    expect(card(d, '2026-10-06')!.key).toBe('level');
    expect(card(d, '2026-10-07')?.key).not.toBe('level');
    // a new account isn't introduced: it starts at Level 1 with everything else
    expect(card(data([cat('a', FROM)]), FROM)?.key).not.toBe('level');
  });

  it("a card on the day the level moves, and the next: up, with the score that earned it, or down, kindly (LVL-11)", () => {
    const up = data([cat('a', FROM)], logs('a', FROM, '2026-10-19'));
    expect(card(up, '2026-10-19')).toMatchObject({ key: 'level', title: 'Up to Level 2 · Starting.' });
    expect(card(up, '2026-10-19')!.body).toBe('100% of your practice days on target over two weeks earned it. A day is clear when one practice gets its small minimum: half its target, 5 to 15 minutes.');
    expect(card(up, '2026-10-21')?.key).not.toBe('level');
    const down = data([cat('a', '2026-08-01')], logs('a', '2026-08-01', '2026-10-04'));
    expect(card(down, '2026-10-12')).toMatchObject({ key: 'level', title: 'Level 9 for now.' });
    expect(card(down, '2026-10-12')!.body).toMatch(/^Easier days and more shields while you get going again\./);
  });

  it('Insights names the practice lifting the level and the one holding it back (LVL-12)', () => {
    const two = (bKeep: (i: number) => boolean) => {
      const d = data([cat('a', FROM), cat('b', FROM, { targets: [{ from: FROM, minutes: 30, days: EVERY_DAY }] })],
        [...logs('a', FROM, '2026-10-18'), ...logs('b', FROM, '2026-10-18', 30, bKeep)]);
      const T = '2026-10-19';
      return buildInsights(d, calc(d, T, FROM), T, 7)!.coach.map(l => l.strong + l.rest);
    };
    // b on target only in the last week: 50% over two weeks, and not slipping
    const lines = two(i => i >= 7);
    expect(lines).toContain("a is your anchor. On target 100% of days in the last two weeks; it's lifting your level.");
    expect(lines).toContain('b is holding your level back. On target 50% of days in the last two weeks. Try 15 minutes a day for a week instead of 30.');
    // b missing most of the last week already has its "slipping" line; no second line about it
    const slipping = two(i => i % 3 === 0);
    expect(slipping.some(l => l.startsWith('b is slipping.'))).toBe(true);
    expect(slipping.some(l => l.startsWith('b is holding'))).toBe(false);
  });

  it("the level's text: what moves it up, or what keeps it when the score is under its threshold (TODAY-22, LVL-12)", () => {
    const base = { moves: [], nextCheck: '2026-11-02' };
    expect(levelText({ ...base, level: 8, score: 80 }).text).toMatch(/^80% of your practice days on target in the last 14 days\. Reach 85% and on .+ you move up to Level 9\.$/);
    expect(levelText({ ...base, level: 8, score: 71 }).text).toBe('71% of your practice days on target in the last 14 days. Stay at 65% or more to keep Level 8; reach 85% to move up.');
    expect(levelText({ ...base, level: 1, score: 0 }).text).toMatch(/^0% of your practice days on target in the last 14 days\. Reach 15% and on .+ you move up to Level 2\.$/);
    expect(levelText({ ...base, level: 10, score: 90 })).toEqual({ text: '90% of your practice days on target in the last 14 days. Stay at 83% or more to keep Level 10.', fill: 90 });
  });
});
