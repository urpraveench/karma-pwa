import { describe, expect, it } from 'vitest';
import { accountTotals, activeSince, cohortFrom, indiaDayRange, metricsDays, metricsFrom, statsDay } from '../functions/src/adminStats';

const DAY = '2026-10-12';

describe('nightly account totals (ADMIN-04)', () => {
  it('reports on yesterday in India, from India midnight to midnight', () => {
    expect(statsDay(new Date('2026-10-12T19:00:00Z'))).toBe('2026-10-12'); // 00:30 on the 13th in India
    expect(indiaDayRange(DAY)).toEqual({ start: new Date('2026-10-11T18:30:00Z'), end: new Date('2026-10-12T18:30:00Z') });
  });

  it('counts active loggers by their newest entry in the last 1, 7 and 28 days', () => {
    expect(activeSince(DAY)).toEqual({ active1: '2026-10-12', active7: '2026-10-06', active28: '2026-09-15' });
    expect(cohortFrom(DAY)).toBe('2026-09-29');
  });

  it('counts accounts and that day\'s sign-ups, leaving out accounts made after the day', () => {
    const t = accountTotals([{ createdDay: '2026-01-01' }, { createdDay: DAY }, { createdDay: DAY }, { createdDay: '2026-10-13' }], DAY);
    expect(t.accounts).toBe(3);
    expect(t.signUps).toBe(2);
  });

  it('activation: sign-ups of the last 7 days that logged anything', () => {
    const t = accountTotals([
      { createdDay: '2026-10-06', lastLogged: '2026-10-06' },
      { createdDay: '2026-10-10' },
      { createdDay: DAY, lastLogged: DAY },
      { createdDay: '2026-10-05', lastLogged: '2026-10-12' }, // 8 days ago: the retention cohort, not activation
    ], DAY);
    expect(t.activation).toEqual({ of: 3, logged: 2 });
  });

  it('7-day retention: sign-ups 7 to 13 days ago who logged in the last 7 days', () => {
    const t = accountTotals([
      { createdDay: '2026-10-05', lastLogged: '2026-10-11' }, // active
      { createdDay: '2026-09-29', lastLogged: '2026-10-06' }, // active, on the edge of both windows
      { createdDay: '2026-10-01', lastLogged: '2026-10-05' }, // stopped
      { createdDay: '2026-10-02' }, // never logged
      { createdDay: '2026-09-28', lastLogged: DAY }, // 14 days ago: outside the cohort
    ], DAY);
    expect(t.retention).toEqual({ of: 4, active: 2 });
    expect(t.accounts).toBe(5);
  });

  it('is all zeros with no accounts', () => {
    expect(accountTotals([], DAY)).toEqual({ accounts: 0, signUps: 0, activation: { of: 0, logged: 0 }, retention: { of: 0, active: 0 } });
  });
});

describe('metrics page data (ADMIN-06)', () => {
  const days = metricsDays(new Date('2026-10-12T19:00:00Z'));
  const computed = { computedAt: { seconds: 1 } };

  it('covers the 30 India days ending yesterday, oldest first', () => {
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-09-13');
    expect(days[29]).toBe(DAY);
  });

  it('charts each day, counting missing days and fields as zero', () => {
    const admin = days.map(() => undefined) as (Record<string, unknown> | undefined)[];
    const stats = [...admin];
    admin[29] = { ...computed, signUps: 3, active7: 9 };
    stats[29] = { logs: 40, minutes: 1200 };
    stats[28] = { logs: 'x' };
    const m = metricsFrom(days, admin, stats);
    expect(m.days[29]).toEqual({ day: DAY, signUps: 3, active7: 9, logs: 40, minutes: 1200 });
    expect(m.days[28]).toEqual({ day: '2026-10-11', signUps: 0, active7: 0, logs: 0, minutes: 0 });
  });

  it('tiles come from the newest day the nightly job ran, compared with 7 days before it', () => {
    const admin = days.map(() => undefined) as (Record<string, unknown> | undefined)[];
    admin[29] = { emails: { welcome: 2 } }; // only email counts: the job hasn't run for it yet
    admin[28] = { ...computed, accounts: 50, active1: 5, active7: 20, active28: 30, activation: { of: 6, logged: 4 }, retention: { of: 5, active: 2 } };
    admin[21] = { ...computed, accounts: 40, active7: 15 };
    const m = metricsFrom(days, admin, []);
    expect(m.latest).toEqual({ day: '2026-10-11', accounts: 50, active1: 5, active7: 20, active28: 30, activation: { of: 6, logged: 4 }, retention: { of: 5, active: 2 } });
    expect(m.weekBefore).toMatchObject({ day: '2026-10-04', accounts: 40, active7: 15, activation: { of: 0, logged: 0 } });
  });

  it('has no tiles before the job has ever run', () => {
    expect(metricsFrom(days, [], [])).toMatchObject({ latest: null, weekBefore: null });
  });
});
