import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { dayMark, monthWeeks, nextShieldText, shiftMonth, weekStart } from '../src/lib/streak';
import type { AppData, Category, Log } from '../src/lib/types';

// Practice due 100 a day from 1 October 2026, Sundays off (4 October is a Sunday).
const cat: Category = {
  id: 'c', name: 'Practice', color: '#000', order: 0, startDate: '2026-10-01', archivedFrom: null,
  targets: [{ from: '2026-10-01', minutes: 100, days: [1, 2, 3, 4, 5, 6] }],
};
let n = 0;
const log = (date: string, minutes = 100): Log => ({ id: 'l' + n++, catId: 'c', date, minutes, note: '', createdAt: 0 });
const data = (logs: Log[]): AppData => ({ categories: [cat], logs, settings: {} });

describe('what each day did for the streak (CALC-15)', () => {
  // 1–3 Oct clear (a shield), 4 Oct rest, 5 Oct missed (shielded), 6 Oct pays it back, 7 Oct missed, 8 Oct is today
  const d = data([log('2026-10-01'), log('2026-10-02'), log('2026-10-03'), log('2026-10-06', 200)]);
  const T = '2026-10-08', c = calc(d, T);
  const mark = (x: string) => dayMark(c, d.categories, x, T);

  it('clear, rest, shield and missed days, from the same calc as the streak', () => {
    expect(['2026-10-01', '2026-10-03', '2026-10-06'].map(mark)).toEqual(['clear', 'clear', 'clear']);
    expect(mark('2026-10-04')).toBe('rest');
    expect(mark('2026-10-05')).toBe('shield');
    expect(mark('2026-10-07')).toBe('miss');
  });

  it("today is 'today' until it is clear; later days are future, earlier ones before", () => {
    expect(mark(T)).toBe('today');
    const done = data([log('2026-10-01')]);
    expect(dayMark(calc(done, '2026-10-01'), done.categories, '2026-10-01', '2026-10-01')).toBe('clear');
    expect(mark('2026-10-09')).toBe('future');
    expect(mark('2026-09-30')).toBe('before');
    expect(dayMark(calc(data([]), T), [], T, T)).toBe('before');
  });

  it('a day with only carried-over minutes owed still has to be cleared', () => {
    // 3 Oct missed with no shield: Sunday 4 Oct owes the carry, so it is missed too, not a rest day
    const x = data([log('2026-10-01'), log('2026-10-02')]), cx = calc(x, '2026-10-05');
    expect(dayMark(cx, x.categories, '2026-10-04', '2026-10-05')).toBe('miss');
  });
});

describe('the calendar (CALC-15)', () => {
  it('weeks run Monday to Sunday, with blanks outside the month', () => {
    const oct = monthWeeks('2026-10');
    expect(oct).toHaveLength(5);
    expect(oct[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(oct[4]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(monthWeeks('2026-02').flat().filter(Boolean)).toHaveLength(28);
    expect(weekStart('2026-10-07')).toBe('2026-10-05');
    expect(weekStart('2026-10-11')).toBe('2026-10-05');
  });

  it('moves across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
  });
});

describe('how far off the next shield is (CALC-15)', () => {
  const at = (logs: Log[], T: string) => calc(data(logs), T);
  it('counts the clear days still needed, and says when all are held', () => {
    expect(nextShieldText(at([], '2026-10-01'), false)).toBe('3 more clear days in a row earn a shield.');
    expect(nextShieldText(at([log('2026-10-01')], '2026-10-02'), false)).toBe('2 more clear days in a row earn a shield.');
    expect(nextShieldText(at([log('2026-10-01'), log('2026-10-02')], '2026-10-03'), false)).toBe('Clear today to earn a shield.');
    expect(nextShieldText(at([log('2026-10-01'), log('2026-10-02')], '2026-10-02'), true)).toBe('Clear tomorrow to earn a shield.');
    const nine = ['01', '02', '03', '05', '06', '07', '08', '09', '10'].map(x => log(`2026-10-${x}`));
    expect(at(nine, '2026-10-10').shields).toBe(3);
    expect(nextShieldText(at(nine, '2026-10-10'), true)).toBe('You hold 3 shields, the most you can.');
  });
});
