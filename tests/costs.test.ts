import { describe, expect, it } from 'vitest';
import { billingFrom, billingQuery, level, LIMITS, periodStart, QUOTA_TZ, sumSeries } from '../functions/src/costs';

describe('costs and limits (ADMIN-13)', () => {
  it('lists the limits from the capacity plan, with consoles to check them in', () => {
    expect(LIMITS.map(l => [l.id, l.limit, l.period])).toEqual([
      ['resend-day', 100, 'day'], ['resend-month', 3000, 'month'], ['app-check', 10_000, 'month'],
      ['firestore-reads', 50_000, 'day'], ['firestore-writes', 20_000, 'day'], ['hosting', 377_487_360, 'day'],
    ]);
    expect(LIMITS.every(l => l.link.startsWith('https://'))).toBe(true);
  });

  it('counts Firebase allowances from midnight Pacific time, today or on the 1st', () => {
    const now = new Date('2026-10-13T12:34:56Z'); // 05:34 in California (daylight time, UTC-7)
    expect(periodStart(now, 'day', QUOTA_TZ).toISOString()).toBe('2026-10-13T07:00:00.000Z');
    expect(periodStart(now, 'month', QUOTA_TZ).toISOString()).toBe('2026-10-01T07:00:00.000Z');
    expect(periodStart(new Date('2026-10-13T06:00:00Z'), 'day', QUOTA_TZ).toISOString()).toBe('2026-10-12T07:00:00.000Z'); // still the 12th there
  });

  it('turns amber from 70% and red from 90%', () => {
    expect([level(0, 100), level(69, 100), level(70, 100), level(89, 100), level(90, 100), level(150, 100)]).toEqual(['ok', 'ok', 'amber', 'amber', 'red', 'red']);
  });

  it('adds up every point of every series, and says when a metric has no data', () => {
    expect(sumSeries({ timeSeries: [{ points: [{ value: { int64Value: '120' } }, { value: { int64Value: '30' } }] }, { points: [{ value: { doubleValue: 0.5 } }] }] })).toBe(150.5);
    expect(sumSeries({ timeSeries: [{ points: [] }] })).toBe(0);
    expect(sumSeries({})).toBeNull();
  });

  it('reads the billing export: this month, after credits, per service', () => {
    expect(billingQuery('tiktym')).toContain('`tiktym.billing_export.gcp_billing_export_v1_*`');
    expect(billingQuery('tiktym')).toContain('UNNEST(credits)');
    const b = billingFrom({ rows: [
      { f: [{ v: 'Cloud Run Functions' }, { v: 'INR' }, { v: '41.237' }] },
      { f: [{ v: 'Cloud Firestore' }, { v: 'INR' }, { v: '3.1' }] },
      { f: [{ v: 'Cloud Storage' }, { v: 'INR' }, { v: '0.001' }] },
    ] });
    expect(b).toEqual({ currency: 'INR', total: 44.34, services: [{ service: 'Cloud Run Functions', cost: 41.24 }, { service: 'Cloud Firestore', cost: 3.1 }] });
    expect(billingFrom({})).toEqual({ currency: 'INR', total: 0, services: [] });
  });
});
