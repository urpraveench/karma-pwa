import { describe, expect, it } from 'vitest';
import { calc } from '../src/lib/backlog';
import { cardStats, formatTime } from '../src/lib/share';
import type { AppData, Category, Log } from '../src/lib/types';

const T = '2026-10-07';
const cat = (id: string, name: string, order: number): Category => ({ id, name, color: '#' + id.repeat(6).slice(0, 6), order, startDate: '2026-09-25', archivedFrom: null, targets: [{ from: '2026-09-25', minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }] });
let n = 0;
const log = (catId: string, date: string, minutes: number): Log => ({ id: 'l' + n++, catId, date, minutes, note: '', createdAt: 0 });

describe('progress card stats (SHARE-01)', () => {
  const data: AppData = {
    categories: [cat('a', 'Reading', 0), cat('b', 'Course study', 1), cat('c', 'Exercise', 2), cat('d', 'Meditation', 3)],
    logs: [
      log('a', '2026-09-30', 300),                       // last month: not counted
      log('a', '2026-10-01', 30), log('a', '2026-10-02', 30),
      log('b', '2026-10-01', 90), log('b', '2026-10-05', 60),
      log('c', '2026-10-06', 20),
      log('d', '2026-10-06', 10),
      log('gone', '2026-10-03', 45),                     // deleted practice: counted in time, not in top
    ],
    settings: {},
  };
  const stats = cardStats(data, calc(data, T), T);

  it("counts only this month's minutes", () => {
    expect(stats.minutes).toBe(30 + 30 + 90 + 60 + 20 + 10 + 45);
  });

  it('counts active days this month', () => {
    expect(stats.activeDays).toBe(5); // 1, 2, 3, 5, 6 October
  });

  it('lists the top three practices by time this month', () => {
    expect(stats.top).toEqual([
      { name: 'Course study', color: '#bbbbbb', minutes: 150 },
      { name: 'Reading', color: '#aaaaaa', minutes: 60 },
      { name: 'Exercise', color: '#cccccc', minutes: 20 },
    ]);
  });

  it('carries the streak and best streak from the backlog engine', () => {
    const c = calc(data, T);
    expect([stats.streak, stats.best]).toEqual([c.streak, c.best]);
  });

  it('is empty, not broken, with no entries this month', () => {
    const empty = cardStats({ ...data, logs: [] }, calc({ ...data, logs: [] }, T), T);
    expect(empty).toMatchObject({ minutes: 0, activeDays: 0, top: [] });
  });
});

describe('formatTime', () => {
  it('uses minutes under an hour, one decimal under ten hours, whole hours after', () => {
    expect(formatTime(45)).toBe('45 min');
    expect(formatTime(60)).toBe('1 h');
    expect(formatTime(210)).toBe('3.5 h');
    expect(formatTime(2820)).toBe('47 h');
  });
});
