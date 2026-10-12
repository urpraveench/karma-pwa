import { describe, expect, it } from 'vitest';
import { metricTiles, niceMax, pct, shortDay } from '../src/admin/metrics';

const tiles = (o: Record<string, unknown> = {}) => ({
  day: '2026-10-12', accounts: 1250, active1: 30, active7: 120, active28: 300,
  activation: { of: 10, logged: 6 }, retention: { of: 8, active: 2 }, ...o,
});

describe('metrics page (ADMIN-06)', () => {
  it('shows each tile with the change from a week before', () => {
    const t = metricTiles(tiles(), tiles({ accounts: 1200, active1: 30, active7: 125, activation: { of: 10, logged: 5 }, retention: { of: 4, active: 1 } }));
    expect(t.map(x => [x.label, x.value, x.change])).toEqual([
      ['Accounts', '1,250', '+50 from a week before'],
      ['Active, 1 day', '30', 'Same as a week before'],
      ['Active, 7 days', '120', '−5 from a week before'],
      ['Active, 28 days', '300', 'Same as a week before'],
      ['Activation', '60%', '+10 pts from a week before'],
      ['7-day retention', '25%', 'Same as a week before'],
    ]);
    expect(t[4].detail).toBe('6 of 10 sign-ups in the last 7 days logged something');
  });

  it('leaves out the change without a week-before day, and the rate without sign-ups', () => {
    const t = metricTiles(tiles({ activation: { of: 0, logged: 0 } }), null);
    expect(t.every(x => x.change === null)).toBe(true);
    expect(t[4]).toMatchObject({ value: '–', detail: 'No sign-ups in the last 7 days' });
    expect(pct(1, 3)).toBe(33);
  });

  it('rounds the chart scale up to 1, 2 or 5 times a power of ten', () => {
    expect([niceMax([]), niceMax([0, 0]), niceMax([3]), niceMax([17]), niceMax([200]), niceMax([4321])]).toEqual([1, 1, 5, 20, 200, 5000]);
    expect(shortDay('2026-10-12')).toBe('12 Oct');
  });
});
