import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { addDays } from '../src/lib/date';
import { buildInsights } from '../src/lib/insights';
import type { AppData, Category, Log } from '../src/lib/types';

// Insights coach lines (INS-10 to INS-19). Today is Wednesday 7 October 2026.

const T = '2026-10-07';
const reading = (startDate: string): Category => ({ id: 'r', name: 'Reading', color: '#000', order: 0, startDate, archivedFrom: null, targets: [{ from: startDate, minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }] });
let n = 0;
const log = (date: string, minutes = 30): Log => ({ id: 'l' + n++, catId: 'r', date, minutes, note: '', createdAt: 0 });
const range = (from: string, to: string, minutes = 30) => { const out: Log[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(log(d, minutes)); return out; };
const coach = (start: string, logs: Log[]) => {
  const data: AppData = { categories: [reading(start)], logs, settings: {} };
  return buildInsights(data, calc(data, T), T, 7)!.coach.map(l => l.strong);
};

describe('coach lines', () => {
  it('new record close (INS-10)', () => {
    const logs = [...range('2026-09-26', '2026-09-30'), log('2026-10-02'), log('2026-10-03', 60), ...range('2026-10-04', '2026-10-06')];
    expect(coach('2026-09-26', logs)[0]).toBe('2 more clear days sets a new record.');
  });

  it('longest run ever, and days straight on a practice (INS-11, INS-14)', () => {
    const lines = coach('2026-09-20', range('2026-09-20', '2026-10-06'));
    expect(lines[0]).toBe('This is your longest run ever: 17 clear days.');
    expect(lines).toContain('17 days straight on Reading.');
  });

  it('practice climbing (INS-13)', () => {
    // 15 a day for the 14 days before, then 30 a day for the last 14
    const lines = coach('2026-09-01', [...range('2026-09-10', '2026-09-23', 15), ...range('2026-09-24', T)]);
    expect(lines[0]).toBe('Reading is climbing.');
  });

  it('weak weekday (INS-15)', () => {
    // 8 weeks, every day logged except Saturdays; Sundays pay back the miss
    const logs = range('2026-08-09', '2026-10-06').filter(l => new Date(l.date + 'T12:00').getDay() !== 6)
      .map(l => new Date(l.date + 'T12:00').getDay() === 0 ? { ...l, minutes: 60 } : l);
    expect(coach('2026-08-09', logs)).toContain('Saturdays are your weak spot.');
  });

  it('backlog clearing at the current pace (INS-16)', () => {
    // three missed weeks capped at 60 carried, then 32 a day against a 30 target
    const lines = coach('2026-09-01', range('2026-09-23', '2026-10-06', 32));
    expect(lines).toContain('Backlog cleared in about 16 days');
  });

  it("backlog isn't shrinking (INS-17)", () => {
    expect(coach('2026-09-01', range('2026-09-15', '2026-10-06'))).toContain("Your backlog isn't shrinking.");
  });

  it('ahead of last week (INS-18)', () => {
    const lines = coach('2026-09-28', [...range('2026-09-28', '2026-10-06'), log(T, 50)]);
    expect(lines).toContain("You're 22% ahead of last week");
  });

  it('behind last week (INS-19)', () => {
    const lines = coach('2026-09-28', [...range('2026-09-28', '2026-10-05')]);
    expect(lines).toContain("You're 67% behind last week");
  });

  it('a practice that lifts you, from how sessions felt (INS-21)', () => {
    const rated = (goods: number, total: number) => range('2026-10-01', '2026-10-06').map((l, i) => i < total ? { ...l, feel: (i < goods ? 3 : 2) as 3 | 2 } : l);
    expect(coach('2026-10-01', rated(3, 5))).toContain('Reading lifts you.');
    expect(coach('2026-10-01', rated(4, 4))).not.toContain('Reading lifts you.'); // too few rated
    expect(coach('2026-10-01', rated(2, 5))).not.toContain('Reading lifts you.'); // under 60% good
  });
});
