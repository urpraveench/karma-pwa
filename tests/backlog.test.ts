import { describe, expect, it } from 'vitest';
import { activeCats, calc, dueOn, showUpStreak, usualHour } from '../src/lib/backlog';
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

  it('totals carried minutes still to work off today', () => {
    const c = calc(data([cat()], [log('2026-10-01', 40), log('2026-10-02', 30)]), '2026-10-02');
    expect(c.totals.carryLeft).toBe(30); // 60 carried in, 30 logged against it
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
