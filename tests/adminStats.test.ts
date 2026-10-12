import { describe, expect, it } from 'vitest';
import { accountTotals, activeSince, cohortFrom, indiaDayRange, statsDay } from '../functions/src/adminStats';

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
