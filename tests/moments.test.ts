import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { moment } from '../src/lib/moments';
import { sampleData } from '../src/lib/sample';
import type { AppData, Category, Log } from '../src/lib/types';

// Wednesday 7 October 2026, 10:00: clear of the month-start, month-end, Monday and weekend moments.
const NOW = new Date(2026, 9, 7, 10);
const T = '2026-10-07';
const cat = (startDate: string, o: Partial<Category> = {}): Category => ({
  id: 'c', name: 'Reading', color: '#000', order: 0, startDate, archivedFrom: null,
  targets: [{ from: startDate, minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }], ...o,
});
const log = (date: string, minutes = 30): Log => ({ id: date, catId: 'c', date, minutes, note: '', createdAt: 0 });
const run = (data: AppData, hidden: string | null = null, user = null) => moment(calc(data, T), { data, user, hidden, now: NOW });

describe('moment', () => {
  it('returns nothing without active practices', () => {
    expect(run({ categories: [], logs: [], settings: {} })).toBeNull();
  });

  it('greets a new user with a small start', () => {
    const m = run({ categories: [cat('2026-10-06')], logs: [], settings: {} });
    expect(m).toMatchObject({ key: 'start', title: 'Start small.', cta: { cat: 'c', goal: 15 } });
  });

  it('uses the first name when there is one', () => {
    const m = moment(calc({ categories: [cat('2026-10-06')], logs: [], settings: {} }, T),
      { data: { categories: [cat('2026-10-06')], logs: [], settings: {} }, user: { id: 'u', email: 'asha.k@example.com', name: null }, hidden: null, now: NOW });
    expect(m?.title).toBe('Start small, Asha.');
  });

  it('switches to a comeback minimum after two silent days', () => {
    const m = run({ categories: [cat('2026-09-20')], logs: [log('2026-10-01')], settings: {} });
    expect(m).toMatchObject({ key: 'comeback', minMode: true, minGoal: 15 });
    expect(m?.body).toContain("It's been 5 days.");
  });

  it('skips a moment the user hid for today', () => {
    expect(run({ categories: [cat('2026-10-06')], logs: [], settings: {} }, 'start')).toBeNull();
  });

  it('returns plain text, leaving escaping to React', () => {
    const m = run({ categories: [cat('2026-10-06', { name: 'Tom & Jerry <3' })], logs: [], settings: {} });
    expect(m?.cta?.label).toBe('Start 15 min of Tom & Jerry <3');
  });

  it('cues a practice near the hour it is usually logged', () => {
    const data = sampleData({}, T); // sample Exercise entries are saved around 7am
    const at = (h: number) => moment(calc(data, T), { data, user: null, hidden: null, now: new Date(2026, 9, 7, h, 30) });
    expect(at(7)).toMatchObject({ key: 'habit', title: "It's your usual Exercise time." });
    expect(at(13)?.key).not.toBe('habit');
  });
});
