// The Costs page (ADMIN-13): this month's Google Cloud spend from the billing export, and how close each free or paid
// limit is. Pure, so it's unit-tested (tests/costs.test.ts); index.ts asks BigQuery and Cloud Monitoring.
import { localParts } from './shared/reminders.js';

export type Period = 'day' | 'month';
export type Level = 'ok' | 'amber' | 'red';

export interface LimitDef {
  id: string; label: string; limit: number; unit: 'count' | 'bytes'; period: Period; link: string;
  /** Where the usage comes from: TikTym's own email counts, or Cloud Monitoring metric types tried in order. */
  source: { emails: true } | { metrics: string[] };
}

/** Firebase's daily and monthly allowances reset at midnight Pacific time; Resend's plan is counted in India days. */
export const QUOTA_TZ = 'America/Los_Angeles';

/** The limits from GTM.md › Capacity on the free plan. Resend: the paid plan from 13 October 2026, 50,000 a month and no daily cap; change it with the plan. */
export const LIMITS: LimitDef[] = [
  { id: 'resend-month', label: 'Resend emails this month', limit: 50_000, unit: 'count', period: 'month', link: 'https://resend.com/emails', source: { emails: true } },
  { id: 'app-check', label: 'App Check checks this month', limit: 10_000, unit: 'count', period: 'month', link: 'https://console.cloud.google.com/security/recaptcha?project={project}',
    source: { metrics: ['recaptchaenterprise.googleapis.com/assessment_count'] } },
  { id: 'firestore-reads', label: 'Firestore reads today', limit: 50_000, unit: 'count', period: 'day', link: 'https://console.firebase.google.com/project/{project}/firestore/usage',
    source: { metrics: ['firestore.googleapis.com/document/read_ops_count', 'firestore.googleapis.com/document/read_count'] } },
  { id: 'firestore-writes', label: 'Firestore writes today', limit: 20_000, unit: 'count', period: 'day', link: 'https://console.firebase.google.com/project/{project}/firestore/usage',
    source: { metrics: ['firestore.googleapis.com/document/write_ops_count', 'firestore.googleapis.com/document/write_count'] } },
  { id: 'hosting', label: 'Hosting transfer today', limit: 360 * 1024 * 1024, unit: 'bytes', period: 'day', link: 'https://console.firebase.google.com/project/{project}/hosting/main',
    source: { metrics: ['firebasehosting.googleapis.com/network/sent_bytes_count'] } },
];

/** The instant `period` began in `tz`: local midnight today, or on the 1st. */
export function periodStart(now: Date, period: Period, tz: string): Date {
  const { date, time } = localParts(now, tz);
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const midnight = minute - (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))) * 60_000;
  return new Date(period === 'day' ? midnight : midnight - (Number(date.slice(8, 10)) - 1) * 86_400_000);
}

/** Amber from 70% of a limit, red from 90%. */
export const level = (used: number, limit: number): Level => (used >= limit * 0.9 ? 'red' : used >= limit * 0.7 ? 'amber' : 'ok');

/** The total of every point in a Cloud Monitoring timeSeries.list answer, or null when it has no series. */
export function sumSeries(res: { timeSeries?: { points?: { value?: { int64Value?: string; doubleValue?: number } }[] }[] }): number | null {
  if (!res.timeSeries?.length) return null;
  let total = 0;
  for (const s of res.timeSeries) for (const p of s.points ?? []) total += Number(p.value?.int64Value ?? p.value?.doubleValue ?? 0);
  return total;
}

export type ExportFormat = 'focus' | 'standard';
export interface BillingTable { dataset: string; table: string; format: ExportFormat }

/**
 * The billing export's table among the project's datasets: a FOCUS usage cost table (in Google's own
 * gcp_billing_immutable_* dataset, or any dataset) first, else a standard usage cost table (gcp_billing_export_v1_*).
 * Null before the export has written anything.
 */
export function pickBillingTable(datasets: { id: string; tables: string[] }[]): BillingTable | null {
  const all = datasets.flatMap(d => d.tables.map(t => ({ dataset: d.id, table: t })));
  const focus = all.find(t => /focus/i.test(t.table) || (/^gcp_billing_immutable_/.test(t.dataset) && !/^gcp_billing_export_/.test(t.table)));
  if (focus) return { ...focus, format: 'focus' };
  const standard = all.find(t => /^gcp_billing_export_v1_/.test(t.table));
  return standard ? { ...standard, format: 'standard' } : null;
}

/** This month's cost per service: FOCUS's EffectiveCost (credits and discounts applied), or standard cost plus credits. */
export function billingQuery(project: string, t: BillingTable): string {
  const from = `\`${project}.${t.dataset}.${t.table}\``;
  if (t.format === 'focus') return `
  SELECT ServiceName AS service, BillingCurrency AS currency, SUM(EffectiveCost) AS cost
  FROM ${from}
  WHERE ChargePeriodStart >= TIMESTAMP(DATE_TRUNC(CURRENT_DATE('America/Los_Angeles'), MONTH), 'America/Los_Angeles')
  GROUP BY service, currency
  ORDER BY cost DESC`;
  return `
  SELECT service.description AS service, currency,
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) AS c), 0)) AS cost
  FROM ${from}
  WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE('America/Los_Angeles'))
  GROUP BY service, currency
  ORDER BY cost DESC`;
}

export interface Billing { currency: string; total: number; services: { service: string; cost: number }[] }

/** The query's rows as services and a total, leaving out services that cost nothing after rounding. */
export function billingFrom(res: { rows?: { f: { v: string | null }[] }[] }): Billing {
  const rows = (res.rows ?? []).map(r => ({ service: String(r.f[0]?.v ?? ''), currency: String(r.f[1]?.v ?? ''), cost: Number(r.f[2]?.v ?? 0) }));
  const services = rows.filter(r => Math.abs(r.cost) >= 0.005).map(r => ({ service: r.service, cost: Math.round(r.cost * 100) / 100 }));
  return { currency: rows[0]?.currency || 'INR', total: Math.round(rows.reduce((s, r) => s + r.cost, 0) * 100) / 100, services };
}
