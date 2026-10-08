import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// The Google Sheets report's data logic (STAT-04): tools/sheets/Code.gs, run here with Google's services stubbed.
const gs = runInNewContext(readFileSync('tools/sheets/Code.gs', 'utf8') + '\n;({ parseStatsDocs_, buildDailyRows_, buildWeeklyRows_, readNotes_, dailyHeader_, weeklyHeader_ })', {
  Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 10) },
});
const doc = (day: string, fields: Record<string, number>) => ({
  name: `projects/tiktym/databases/(default)/documents/stats/${day}`,
  fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { integerValue: String(v) }])),
});

describe('Google Sheets report (STAT-04)', () => {
  const byDay = gs.parseStatsDocs_([
    doc('2026-10-05', { activeDevices: 4, signUps: 2, logs: 10, minutes: 300, timersStarted: 4, timersReachedTarget: 3, logQuick: 6, logTimer: 4 }),
    doc('2026-10-07', { activeDevices: 5, logs: 12, minutes: 360 }),
    { name: 'projects/tiktym/databases/(default)/documents/stats/not-a-date', fields: {} },
  ]);
  const header = gs.dailyHeader_() as string[];
  const col = (row: unknown[], name: string) => row[header.indexOf(name)];

  it('reads counters from Firestore documents and skips anything not named like a date', () => {
    expect(Object.keys(byDay)).toEqual(['2026-10-05', '2026-10-07']);
    expect(byDay['2026-10-05']).toMatchObject({ logs: 10, minutes: 300, logQuick: 6 });
  });

  it('writes one row per day to today, with gaps as zeros and derived columns', () => {
    const rows = gs.buildDailyRows_(byDay, '2026-10-08', {});
    expect(rows.map((r: unknown[]) => r[0])).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
    expect(col(rows[1], 'Entries')).toBe(0);
    expect(col(rows[0], 'Hours')).toBe(5);
    expect(col(rows[0], 'Entries per active device')).toBe(2.5);
    expect(col(rows[0], 'Timer completion %')).toBe(75);
    expect(col(rows[1], 'Timer completion %')).toBe(0); // no division by zero
  });

  it('keeps the notes you typed, by date', () => {
    const existing = [header, ['2026-10-05', ...Array(header.length - 2).fill(0), 'LinkedIn post']];
    const notes = gs.readNotes_(existing);
    expect(notes).toEqual({ '2026-10-05': 'LinkedIn post' });
    const rows = gs.buildDailyRows_(byDay, '2026-10-08', notes);
    expect(col(rows[0], 'Notes')).toBe('LinkedIn post');
  });

  it('sums Monday-to-Sunday weeks and shows the change from the week before', () => {
    const more = gs.parseStatsDocs_([doc('2026-09-30', { logs: 8 }), doc('2026-10-05', { logs: 10 }), doc('2026-10-06', { logs: 2 })]);
    const weeks = gs.buildWeeklyRows_(gs.buildDailyRows_(more, '2026-10-06', {}));
    const wh = gs.weeklyHeader_() as string[];
    expect(weeks.map((w: unknown[]) => [w[0], w[wh.indexOf('Entries')], w[wh.indexOf('Entries vs previous week %')]]))
      .toEqual([['2026-09-28', 8, ''], ['2026-10-05', 12, 50]]);
  });

  it('the app, the security rules and the Sheet all list the same counters', () => {
    const names = (text: string, re: RegExp) => [...text.match(re)![1].matchAll(/'(\w+)'/g)].map(m => m[1]).filter(n => /^[a-z]/.test(n) && n !== 'Logged').sort();
    const app = names(readFileSync('src/lib/stats.ts', 'utf8'), /COUNTERS = \[([\s\S]*?)\] as const/);
    const rules = names(readFileSync('firestore.rules', 'utf8'), /function counters\(\) \{[\s\S]*?return \[([\s\S]*?)\];/);
    const sheet = [...readFileSync('tools/sheets/Code.gs', 'utf8').match(/const COUNTERS = \[([\s\S]*?)\];\n/)![1].matchAll(/\['(\w+)'/g)].map(m => m[1]).sort();
    expect(app).toHaveLength(14);
    expect(rules).toEqual(app);
    expect(sheet).toEqual(app);
  });
});
