import { describe, expect, it } from 'vitest';
import { billingFrom, billingQuery, level, LIMITS, periodStart, pickBillingTable, QUOTA_TZ, sumSeries } from '../functions/src/costs';

describe('costs and limits (ADMIN-13)', () => {
  it('lists the limits from the capacity plan, with consoles to check them in', () => {
    expect(LIMITS.map(l => [l.id, l.limit, l.period])).toEqual([
      ['resend-month', 50_000, 'month'], ['app-check', 10_000, 'month'],
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
    const standard = billingQuery('tiktym', { dataset: 'billing_export', table: 'gcp_billing_export_v1_0145', format: 'standard' });
    expect(standard).toContain('`tiktym.billing_export.gcp_billing_export_v1_0145`');
    expect(standard).toContain('UNNEST(credits)');
    const b = billingFrom({ rows: [
      { f: [{ v: 'Cloud Run Functions' }, { v: 'INR' }, { v: '41.237' }] },
      { f: [{ v: 'Cloud Firestore' }, { v: 'INR' }, { v: '3.1' }] },
      { f: [{ v: 'Cloud Storage' }, { v: 'INR' }, { v: '0.001' }] },
    ] });
    expect(b).toEqual({ currency: 'INR', total: 44.34, services: [{ service: 'Cloud Run Functions', cost: 41.24 }, { service: 'Cloud Firestore', cost: 3.1 }] });
    expect(billingFrom({})).toEqual({ currency: 'INR', total: 0, services: [] });
  });

  it('finds the billing export: a FOCUS table first, else a standard one, and none before data arrives', () => {
    const immutable = 'gcp_billing_immutable_014531_E38200_BE39C7_us';
    expect(pickBillingTable([{ id: immutable, tables: [] }])).toBeNull();
    expect(pickBillingTable([])).toBeNull();
    expect(pickBillingTable([{ id: immutable, tables: ['gcp_billing_focus_usage_cost'] }])).toEqual({ dataset: immutable, table: 'gcp_billing_focus_usage_cost', format: 'focus' });
    expect(pickBillingTable([{ id: immutable, tables: ['usage_cost_v1'] }])?.format).toBe('focus');
    expect(pickBillingTable([{ id: 'billing_export', tables: ['gcp_billing_export_v1_0145'] }])).toEqual({ dataset: 'billing_export', table: 'gcp_billing_export_v1_0145', format: 'standard' });
    expect(pickBillingTable([
      { id: 'billing_export', tables: ['gcp_billing_export_v1_0145'] }, { id: immutable, tables: ['focus_v1'] },
    ])?.format).toBe('focus');
  });

  it('reads FOCUS: effective cost (credits and discounts applied) per service since the 1st, Pacific time', () => {
    const q = billingQuery('tiktym', { dataset: 'ds', table: 'focus_v1', format: 'focus' });
    expect(q).toContain('FROM `tiktym.ds.focus_v1`');
    expect(q).toContain('SUM(EffectiveCost) AS cost');
    expect(q).toContain('ServiceName AS service, BillingCurrency AS currency');
    expect(q).toContain("ChargePeriodStart >= TIMESTAMP(DATE_TRUNC(CURRENT_DATE('America/Los_Angeles'), MONTH), 'America/Los_Angeles')");
  });
});
