// The metrics page's tiles and chart scales (ADMIN-06), from what the adminMetrics function returns. Pure, so it's
// unit-tested (tests/adminMetrics.test.ts).
import type { Metrics, MetricsDay, MetricsTiles } from '../../functions/src/adminStats';

export type { Metrics, MetricsDay };

export interface Tile { label: string; value: string; detail: string; change: string | null }

const n = (v: number) => v.toLocaleString('en-GB');
export const pct = (part: number, of: number) => (of ? Math.round((part / of) * 100) : null);

function change(diff: number | null, unit = ''): string | null {
  if (diff === null) return null;
  if (diff === 0) return 'Same as a week before';
  return `${diff > 0 ? '+' : '−'}${n(Math.abs(diff))}${unit} from a week before`;
}

function rateTile(label: string, part: number, of: number, before: number | null, detail: string, none: string): Tile {
  const now = pct(part, of);
  return { label, value: now === null ? '–' : `${now}%`, detail: of ? detail : none, change: now === null || before === null ? null : change(now - before, ' pts') };
}

/** The six tiles: accounts, active loggers over 1, 7 and 28 days, activation and 7-day retention. */
export function metricTiles(latest: MetricsTiles, before: MetricsTiles | null): Tile[] {
  const diff = (k: 'accounts' | 'active1' | 'active7' | 'active28') => (before ? latest[k] - before[k] : null);
  const a = latest.activation, r = latest.retention;
  return [
    { label: 'Accounts', value: n(latest.accounts), detail: 'Every sign-up so far', change: change(diff('accounts')) },
    { label: 'Active, 1 day', value: n(latest.active1), detail: 'Newest entry on the day', change: change(diff('active1')) },
    { label: 'Active, 7 days', value: n(latest.active7), detail: 'Newest entry in the last 7 days', change: change(diff('active7')) },
    { label: 'Active, 28 days', value: n(latest.active28), detail: 'Newest entry in the last 28 days', change: change(diff('active28')) },
    rateTile('Activation', a.logged, a.of, before ? pct(before.activation.logged, before.activation.of) : null,
      `${n(a.logged)} of ${n(a.of)} sign-ups in the last 7 days logged something`, 'No sign-ups in the last 7 days'),
    rateTile('7-day retention', r.active, r.of, before ? pct(before.retention.active, before.retention.of) : null,
      `${n(r.active)} of ${n(r.of)} who signed up 7 to 13 days ago logged this week`, 'No sign-ups 7 to 13 days ago'),
  ];
}

/** A round top for a chart's scale: 1, 2 or 5 times a power of ten, at least the largest value (and at least 1). */
export function niceMax(values: number[]): number {
  const max = Math.max(1, ...values);
  const p = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map(m => m * p).find(v => v >= max)!;
}

/** "13 Oct" for chart labels and tooltips. */
export const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmt = n;
