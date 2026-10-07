import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { addDays, ymd } from '../src/lib/date';
import { moment } from '../src/lib/moments';
import type { AppData, Category, Log } from '../src/lib/types';

// One scenario per moment, each on a date chosen so that moment is the top match.

const reading = (startDate: string): Category => ({ id: 'r', name: 'Reading', color: '#000', order: 0, startDate, archivedFrom: null, targets: [{ from: startDate, minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }] });
let n = 0;
const log = (date: string, minutes = 30): Log => ({ id: 'l' + n++, catId: 'r', date, minutes, note: '', createdAt: 0 });
const range = (from: string, to: string, minutes = 30) => { const out: Log[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(log(d, minutes)); return out; };
const run = (data: AppData, now: Date) => moment(calc(data, ymd(now)), { data, user: null, hidden: null, now });
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe('moments', () => {
  it('month recap on the 1st–3rd, against the month before (MOM-01)', () => {
    const data = { categories: [reading('2026-08-01')], logs: range('2026-08-01', '2026-10-01'), settings: {} };
    const m = run(data, at(2026, 10, 2));
    expect(m).toMatchObject({ key: 'month', recap: true, title: 'September, wrapped' });
    expect(m!.body).toBe('3% less than August. A new month is a clean page.'); // 900 vs 930 points
    expect(m!.stats).toEqual([['15 h', 'practised'], ['30/30', 'days cleared'], ['100%', 'Reading, your best']]);
  });

  it('month recap for a first full month (MOM-01)', () => {
    const data = { categories: [reading('2026-09-01')], logs: range('2026-09-01', '2026-10-01'), settings: {} };
    expect(run(data, at(2026, 10, 2))!.body).toBe("Your first full month on record. Here's what you built.");
  });

  it('weekend push when behind the weekly pace (MOM-03)', () => {
    // Mon–Thu logged, Friday missed; Saturday 10 October
    const data = { categories: [reading('2026-09-28')], logs: [...range('2026-09-28', '2026-10-04'), ...range('2026-10-05', '2026-10-08')], settings: {} };
    const m = run(data, at(2026, 10, 10));
    expect(m).toMatchObject({ key: 'weekend', title: 'Weekend push' });
    expect(m!.body).toBe("You're 90 points short of this week's 210. About 45 a day this weekend closes it. Biggest gap: Reading.");
    expect(m!.stats).toEqual([[120, 'done this week'], [210, 'weekly goal'], [45, 'a day to close']]);
  });

  it('Sunday is "Last day of the week" (MOM-03)', () => {
    // a short Saturday entry, so this isn't a comeback (nothing logged for 3 days outranks it)
    const data = { categories: [reading('2026-09-28')], logs: [...range('2026-09-28', '2026-10-04'), ...range('2026-10-05', '2026-10-08'), log('2026-10-10', 10)], settings: {} };
    expect(run(data, at(2026, 10, 11))).toMatchObject({ key: 'weekend', title: 'Last day of the week' });
  });

  it('minimum day after a weak week (MOM-04)', () => {
    // started 20 Sep, only Monday logged in the last week; Wednesday 7 October
    const data = { categories: [reading('2026-09-20')], logs: [log('2026-10-05')], settings: {} };
    expect(run(data, at(2026, 10, 7))).toMatchObject({ key: 'minimum', minMode: true, minGoal: 15, title: 'Make today a minimum day.' });
  });

  it('best month in reach on the last two days (MOM-05)', () => {
    const data = { categories: [reading('2026-09-01')], logs: [...range('2026-09-01', '2026-09-30'), ...range('2026-10-01', '2026-10-29')], settings: {} };
    const m = run(data, at(2026, 10, 30));
    expect(m).toMatchObject({ key: 'bestmonth', title: 'Best month in reach.' });
    expect(m!.body).toMatch(/^31 more points by .+ makes October your best month yet\.$/);
  });

  it('already the best month (MOM-05)', () => {
    const data = { categories: [reading('2026-09-01')], logs: [...range('2026-09-01', '2026-09-30'), ...range('2026-10-01', '2026-10-30', 31)], settings: {} };
    const m = run(data, at(2026, 10, 30));
    expect(m).toMatchObject({ key: 'bestmonth', title: 'October is already your best month.' });
  });

  it('fresh week on Monday (MOM-06)', () => {
    const data = { categories: [reading('2026-09-20')], logs: range('2026-09-20', '2026-10-04'), settings: {} };
    const m = run(data, at(2026, 10, 5));
    expect(m).toMatchObject({ key: 'monday', title: 'Fresh week.' });
    expect(m!.body).toBe("Last week: 100% of target and 7 clear days. Clear today and you're already ahead of it.");
  });

  it('on a roll after 3+ clear days (MOM-08)', () => {
    const data = { categories: [reading('2026-09-20')], logs: range('2026-09-20', '2026-10-06'), settings: {} };
    const m = run(data, at(2026, 10, 7));
    expect(m).toMatchObject({ key: 'roll', title: 'Day 18 is waiting.', body: '17 clear days in a row. 30 points keeps it going.' });
  });

  it('on a roll, one day from a record (MOM-08)', () => {
    // best run of 5 (26–30 Sep), a miss on 1 Oct paid back by 3 Oct, then 4 clear days
    const logs = [...range('2026-09-26', '2026-09-30'), log('2026-10-02'), log('2026-10-03', 60), ...range('2026-10-04', '2026-10-06')];
    const data = { categories: [reading('2026-09-26')], logs, settings: {} };
    expect(run(data, at(2026, 10, 7))).toMatchObject({ key: 'roll', title: 'A new record is one day away.' });
  });
});
