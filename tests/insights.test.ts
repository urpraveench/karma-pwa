import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { buildInsights, hit } from '../src/lib/insights';
import { sampleData } from '../src/lib/sample';
import type { AppData, Category, Log } from '../src/lib/types';

const T = '2026-10-07'; // a Wednesday
const cat = (o: Partial<Category> = {}): Category => ({
  id: 'c', name: 'Reading', color: '#000', order: 0, startDate: '2026-09-01', archivedFrom: null,
  targets: [{ from: '2026-09-01', minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }], ...o,
});
let n = 0;
const log = (date: string, minutes = 30, catId = 'c'): Log => ({ id: 'l' + n++, catId, date, minutes, note: '', createdAt: 0 });
const build = (d: AppData, range = 7) => buildInsights(d, calc(d, T), T, range);

describe('hit', () => {
  it('caps each day at its target and ignores days with nothing due', () => {
    expect(hit([{ due: 30, done: 60 }, { due: 30, done: 0 }, { due: 0, done: 20 }])).toBe(50);
    expect(hit([{ due: 0, done: 5 }])).toBeNull();
  });
});

describe('buildInsights', () => {
  it('returns null until there is something logged', () => {
    expect(build({ categories: [cat()], logs: [], settings: {} })).toBeNull();
  });

  it('compares this week with the same point last week', () => {
    // Started Mon 28 Sep. Mon–Wed last week: 30, 0, 0. Mon–Wed this week: 30, 30, 0.
    // Last Monday ends clear; this week each day also owes the capped 60 carried in, so none clear.
    const start = '2026-09-28';
    const d = { categories: [cat({ startDate: start, targets: [{ from: start, minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }] })], logs: [log('2026-10-05'), log('2026-10-06'), log(start)], settings: {} };
    const w = build(d)!.week;
    expect(w.points).toEqual({ value: 60, prev: 30 });
    expect(w.clear).toEqual({ value: 0, prev: 1 });
    expect(w.showDelta).toBe(true);
  });

  it('flags a practice that is slipping', () => {
    const logs = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map(d => log(d)); // then nothing for 4 days
    const ins = build({ categories: [cat()], logs, settings: {} })!;
    expect(ins.coach.some(l => l.strong === 'Reading is slipping.')).toBe(true);
    expect(ins.health[0].strip.slice(-4)).toEqual(['miss', 'miss', 'miss', 'today']);
  });

  it('always has at least one coach line', () => {
    const ins = build({ categories: [cat()], logs: [log(T)], settings: {} })!;
    expect(ins.coach.length).toBeGreaterThanOrEqual(1);
  });

  it('finds the weak weekday in sample data (Saturdays)', () => {
    const d = sampleData({}, T);
    const ins = build(d)!;
    expect(ins.weekday.weakest?.[1]).toBe(6);
    expect(ins.detail).toHaveLength(7);
    expect(build(d, 30)!.detail).toHaveLength(30);
  });

  it('points at the next streak and hours milestones', () => {
    const logs = ['2026-10-04', '2026-10-05', '2026-10-06', T].map(d => log(d, 60));
    const ins = build({ categories: [cat({ startDate: '2026-10-04', targets: [{ from: '2026-10-04', minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }] })], logs, settings: {} })!;
    expect(ins.milestones.streak).toEqual({ value: 4, prev: 3, next: 7 });
    expect(ins.milestones.hours).toEqual({ value: 4, prev: 0, next: 5 });
    expect(ins.milestones.clearDays).toBe(4);
  });
});
