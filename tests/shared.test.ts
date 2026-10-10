import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { forFunctions, SHARED } from '../scripts/shared-code';
import { practicesLeft } from '../src/lib/backlog';
import { practicesLeft as serverPracticesLeft } from '../functions/src/shared/backlog';
import type { AppData, Category, Log } from '../src/lib/types';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const cat = (id: string, minutes: number, o: Partial<Category> = {}): Category => ({
  id, name: id, color: '#000', order: 0, startDate: '2026-10-01', archivedFrom: null, targets: [{ from: '2026-10-01', minutes, days: EVERY_DAY }], ...o,
});
let n = 0;
const log = (catId: string, date: string, minutes: number): Log => ({ id: 'l' + n++, catId, date, minutes, note: '', createdAt: 0 });
const data = (categories: Category[], logs: Log[] = []): AppData => ({ categories, logs, settings: {} });
const T = '2026-10-07';
const names = (d: AppData) => practicesLeft(d, T).map(c => c.name);

describe('the server counts what Today shows (NOTIF-10)', () => {
  it("the functions' copy of the backlog rules matches the app's (run npm run functions:shared)", () => {
    for (const name of SHARED)
      expect(readFileSync(`functions/src/shared/${name}.ts`, 'utf8'), name).toBe(forFunctions(name, readFileSync(`src/lib/${name}.ts`, 'utf8')));
  });

  it('only shared files may be imported by a shared file', () => {
    expect(() => forFunctions('backlog', "import { x } from './moments';")).toThrow(/moments/);
  });

  it('practices still due today, in the order shown; a practice logged partly still counts', () => {
    const cats = [cat('Reading', 30, { order: 1 }), cat('Exercise', 30, { order: 0 }), cat('Breathe', 10, { order: 2 })];
    const logs = [...['01', '02', '03', '04', '05', '06'].flatMap(d => cats.map(c => log(c.id, `2026-10-${d}`, c.targets[0].minutes))), log('Reading', T, 15), log('Breathe', T, 10)];
    expect(names(data(cats, logs))).toEqual(['Exercise', 'Reading']);
  });

  it('carried-over minutes count: done today, but still owing from yesterday', () => {
    const d = data([cat('Exercise', 30)], [log('Exercise', '2026-10-01', 30), log('Exercise', '2026-10-02', 30), log('Exercise', '2026-10-03', 30),
      log('Exercise', '2026-10-04', 30), log('Exercise', '2026-10-05', 30), log('Exercise', T, 30)]);
    expect(names(d)).toEqual(['Exercise']); // 6 October was missed
  });

  it('nothing when today is clear, a rest day, or the practice is archived', () => {
    const rest = cat('Guitar', 20, { startDate: T, targets: [{ from: T, minutes: 20, days: [0] }] }); // Sundays only; the 7th is a Wednesday
    expect(names(data([rest]))).toEqual([]);
    expect(names(data([cat('Old', 20, { archivedFrom: '2026-10-05' })]))).toEqual([]);
    expect(names(data([cat('New', 20, { startDate: T, targets: [{ from: T, minutes: 20, days: EVERY_DAY }] })], [log('New', T, 25)]))).toEqual([]);
  });

  it('the server copy gives the same answer', () => {
    const d = data([cat('Exercise', 30), cat('Reading', 30, { order: 1 })], [log('Reading', T, 30)]);
    expect(serverPracticesLeft(d, T).map(c => c.name)).toEqual(names(d));
  });
});
