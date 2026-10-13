import { describe, expect, it } from 'vitest';
import { activeCats, calc, carriedLeft, dueLeft, dueOn, showUpStreak, usualHour } from '../src/lib/backlog';
import type { AppData, Category, Log, Settings } from '../src/lib/types';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const cat = (o: Partial<Category> = {}): Category => ({
  id: 'c', name: 'Practice', color: '#000', order: 0, startDate: '2026-10-01', archivedFrom: null,
  targets: [{ from: '2026-10-01', minutes: 100, days: EVERY_DAY }], ...o,
});
let n = 0;
const log = (date: string, minutes: number, catId = 'c', createdAt = 0): Log => ({ id: 'l' + n++, catId, date, minutes, note: '', createdAt });
const data = (categories: Category[], logs: Log[] = [], settings: Settings = {}): AppData => ({ categories, logs, settings });

describe('calc', () => {
  it('carries the shortfall forward (README example)', () => {
    const d = data([cat()], [log('2026-10-01', 40), log('2026-10-02', 130)]);
    const c = calc(d, '2026-10-02').per.c;
    expect(c.byDate.get('2026-10-01')!.end).toBe(60);
    expect(c.today.owed).toBe(160);
    expect(c.today.end).toBe(30);
  });

  it('does not bank credit for logging more than owed', () => {
    const d = data([cat()], [log('2026-10-01', 250)]);
    expect(calc(d, '2026-10-02').per.c.today).toMatchObject({ opening: 0, owed: 100 });
  });

  it('caps carried backlog at 2 days of target by default', () => {
    const r = calc(data([cat()]), '2026-10-06').per.c.today;
    expect(r.opening).toBe(200);
    expect(r.owed).toBe(300);
  });

  it('carries full debt when the cap is None', () => {
    const r = calc(data([cat()], [], { backlogCap: 0 }), '2026-10-06').per.c.today;
    expect(r.opening).toBe(500);
  });

  it('adds nothing on unscheduled days', () => {
    // 2026-10-03 is a Saturday, 2026-10-04 a Sunday
    const c = cat({ targets: [{ from: '2026-10-01', minutes: 30, days: [1, 2, 3, 4, 5] }] });
    expect(dueOn(c, '2026-10-03')).toBe(0);
    expect(dueOn(c, '2026-10-05')).toBe(30);
    expect(calc(data([c], [log('2026-10-01', 30), log('2026-10-02', 30)]), '2026-10-04').per.c.today.owed).toBe(0);
  });

  it('applies a target change only from its start date', () => {
    const c = cat({ targets: [{ from: '2026-10-01', minutes: 100, days: EVERY_DAY }, { from: '2026-10-03', minutes: 20, days: EVERY_DAY }] });
    expect(dueOn(c, '2026-10-02')).toBe(100);
    expect(dueOn(c, '2026-10-03')).toBe(20);
  });

  it('ignores days before the start date', () => {
    expect(dueOn(cat({ startDate: '2026-10-05' }), '2026-10-04')).toBe(0);
  });

  it('clears backlog and stops accruing once archived', () => {
    const c = cat({ archivedFrom: '2026-10-03' });
    const r = calc(data([c]), '2026-10-04').per.c;
    expect(r.byDate.get('2026-10-02')!.end).toBe(200);
    expect(r.today).toMatchObject({ opening: 0, owed: 0, end: 0 });
    expect(activeCats([c], '2026-10-04')).toHaveLength(0);
    expect(calc(data([c]), '2026-10-04').totals.owed).toBe(0);
  });

  it('counts clear days as a streak and remembers the best run', () => {
    // 10-03 missed, 10-04 pays it back: the run restarts on 10-04 and today counts once clear
    const logs = [log('2026-10-01', 100), log('2026-10-02', 100), log('2026-10-04', 200), log('2026-10-05', 100), log('2026-10-06', 100)];
    const c = calc(data([cat()], logs), '2026-10-06');
    expect(c.streak).toBe(3);
    expect(c.best).toBe(3);
    expect(c.totals).toMatchObject({ owed: 100, done: 100, end: 0 });
  });

  it('three clear days earn a shield that covers one missed day (CALC-14)', () => {
    const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => log(`2026-10-${String(from + i).padStart(2, '0')}`, 100));
    // 1–3 clear earns a shield; 4 missed; 5 pays it back with today's 100
    const logs = [...days(1, 3), log('2026-10-05', 200)];
    const c = calc(data([cat()], logs), '2026-10-05');
    expect(c).toMatchObject({ streak: 4, best: 4, shields: 0, shielded: ['2026-10-04'] });
    // today isn't over, so it never spends a shield
    expect(calc(data([cat()], days(1, 3)), '2026-10-04')).toMatchObject({ streak: 3, shields: 1, shielded: [] });
    // the shielded day restarts the count to the next shield: 5–6 isn't three days, 5–7 is
    expect(calc(data([cat()], [...logs, ...days(6, 6)]), '2026-10-06').shields).toBe(0);
    expect(calc(data([cat()], [...logs, ...days(6, 7)]), '2026-10-07').shields).toBe(1);
    // three at most
    expect(calc(data([cat()], days(1, 12)), '2026-10-12').shields).toBe(3);
    // with no shield, a miss still breaks the streak
    expect(calc(data([cat()], [...days(1, 2), log('2026-10-04', 200)]), '2026-10-04')).toMatchObject({ streak: 1, best: 2, shields: 0 });
  });

  it('backfilling a past day recalculates every day after it', () => {
    const before = calc(data([cat()], [log('2026-10-02', 100), log('2026-10-03', 100)]), '2026-10-03').per.c;
    expect(before.byDate.get('2026-10-01')!.end).toBe(100);
    expect(before.today.end).toBe(100); // 1 Oct's miss is still carried
    const after = calc(data([cat()], [log('2026-10-02', 100), log('2026-10-03', 100), log('2026-10-01', 100)]), '2026-10-03').per.c;
    expect(after.byDate.get('2026-10-02')!.opening).toBe(0);
    expect(after.today.end).toBe(0);
  });

  it("minutes logged today count toward today's target before the backlog (CALC-13)", () => {
    const c = calc(data([cat()], [log('2026-10-01', 40), log('2026-10-02', 30)]), '2026-10-02');
    expect(c.totals.carryLeft).toBe(60); // 60 carried in; the 30 logged go to today's 100
    expect(carriedLeft(c.per.c.today)).toBe(60);
    const more = calc(data([cat()], [log('2026-10-01', 40), log('2026-10-02', 130)]), '2026-10-02');
    expect(carriedLeft(more.per.c.today)).toBe(30); // today's 100 done, 30 of the 60 carried worked off
  });

  it("today's own minutes left exclude the backlog (CALC-16)", () => {
    const c = calc(data([cat()], [log('2026-10-01', 40), log('2026-10-02', 30)]), '2026-10-02').per.c.today;
    expect(dueLeft(c)).toBe(70);
    expect(dueLeft(c) + carriedLeft(c)).toBe(c.end);
    const over = calc(data([cat()], [log('2026-10-01', 40), log('2026-10-02', 120)]), '2026-10-02').per.c.today;
    expect(dueLeft(over)).toBe(0);
    expect(carriedLeft(over)).toBe(40);
    const rest = calc(data([cat({ targets: [{ from: '2026-10-01', minutes: 100, days: [4] }] })], []), '2026-10-02').per.c.today; // due Thursdays only: 1 Oct, not 2 Oct
    expect(dueLeft(rest)).toBe(0);
    expect(carriedLeft(rest)).toBe(100);
  });
});

describe('showUpStreak', () => {
  it('counts days with any entry, starting yesterday if today is empty', () => {
    const logs = [log('2026-10-04', 5), log('2026-10-05', 5), log('2026-10-06', 5)];
    expect(showUpStreak(logs, '2026-10-07')).toBe(3);
    expect(showUpStreak([...logs, log('2026-10-07', 5)], '2026-10-07')).toBe(4);
    expect(showUpStreak([log('2026-10-05', 5)], '2026-10-07')).toBe(0);
  });
});

describe('usualHour', () => {
  const at = (date: string, h: number) => log(date, 10, 'c', new Date(`${date}T${String(h).padStart(2, '0')}:15:00`).getTime());

  it('returns the median hour with at least five entries', () => {
    const logs = [at('2026-10-01', 6), at('2026-10-02', 7), at('2026-10-03', 7), at('2026-10-04', 8), at('2026-10-05', 21)];
    expect(usualHour(logs, 'c', '2026-10-07')).toBe(7);
  });

  it('returns null with fewer than five entries', () => {
    expect(usualHour([at('2026-10-01', 6), at('2026-10-02', 7)], 'c', '2026-10-07')).toBeNull();
  });
});
