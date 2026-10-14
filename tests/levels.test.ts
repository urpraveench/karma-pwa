import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { addDays } from '../src/lib/date';
import { levelFor, levels, nextMonday, score, tierOf } from '../src/lib/levels';
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

  it("scores the share of practice-days whose own target was met, ignoring the backlog and days with nothing due (LVL-02)", () => {
    const weekdays = cat('w', '2026-09-28', { targets: [{ from: '2026-09-28', minutes: 10, days: [1, 2, 3, 4, 5] }] });
    // 28 Sep to 4 Oct: daily practice met on 4 of 7 days; weekday practice met on 3 of its 5 days (the weekend owes nothing)
    const d = data([cat('a', '2026-09-28'), weekdays], [...logs('a', '2026-09-28', '2026-10-01'), ...logs('w', '2026-09-30', '2026-10-02')]);
    const c = calc(d, '2026-10-04');
    expect(score(c, d.categories, '2026-09-28', '2026-10-04')).toBe(58); // 7 of 12
    // a day whose target is met counts, even with carried-over minutes still owed
    const owed = data([cat('a', '2026-09-28')], logs('a', '2026-09-29', '2026-09-29'));
    expect(score(calc(owed, '2026-09-29'), owed.categories, '2026-09-29', '2026-09-29')).toBe(100);
    expect(score(c, d.categories, '2026-09-20', '2026-09-27')).toBeNull();
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
});
