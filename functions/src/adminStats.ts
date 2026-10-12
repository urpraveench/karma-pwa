// The admin console's nightly account totals, adminStats/{day} (ADMIN-04). Pure, so it's unit-tested
// (tests/adminStats.test.ts); index.ts reads Auth and Firestore and saves the result. Days are India dates, like the emails.
import { indiaToday } from './comeback.js';
import { addDays } from './recap.js';

/** The day the 00:30 job reports on: yesterday in India. */
export const statsDay = (now: Date) => addDays(indiaToday(now), -1);

/** The first instant of an India date, and of the day after, for range queries on timestamps. */
export const indiaDayRange = (day: string) => ({ start: new Date(`${day}T00:00:00+05:30`), end: new Date(`${addDays(day, 1)}T00:00:00+05:30`) });

/** The lastLogged dates that count an account as active in the last 1, 7 and 28 days up to `day`. */
export const activeSince = (day: string) => ({ active1: day, active7: addDays(day, -6), active28: addDays(day, -27) });

/** Sign-ups whose activation (the last 7 days) and 7-day retention (7 to 13 days ago) the job looks at. */
export const cohortFrom = (day: string) => addDays(day, -13);

export interface Account { createdDay: string; lastLogged?: string }

export interface AccountTotals {
  accounts: number;
  signUps: number;
  /** Sign-ups of the last 7 days, and how many of them have logged anything. */
  activation: { of: number; logged: number };
  /** Sign-ups 7 to 13 days ago, and how many of them logged in the last 7 days. */
  retention: { of: number; active: number };
}

/** Totals from every account's sign-up date (India) and, for recent sign-ups, its newest entry's date. */
export function accountTotals(accounts: Account[], day: string): AccountTotals {
  const weekAgo = addDays(day, -6), cohortEnd = addDays(day, -7), from = cohortFrom(day);
  const t: AccountTotals = { accounts: 0, signUps: 0, activation: { of: 0, logged: 0 }, retention: { of: 0, active: 0 } };
  for (const a of accounts) {
    if (a.createdDay > day) continue; // signed up after the day being reported
    t.accounts++;
    if (a.createdDay === day) t.signUps++;
    if (a.createdDay >= weekAgo) {
      t.activation.of++;
      if (a.lastLogged) t.activation.logged++;
    } else if (a.createdDay >= from && a.createdDay <= cohortEnd) {
      t.retention.of++;
      if (a.lastLogged && a.lastLogged >= weekAgo) t.retention.active++;
    }
  }
  return t;
}

/** The kinds of email counted in adminStats/{day}.emails, as each one is sent. */
export type EmailKind = 'welcome' | 'oneTap' | 'nudge' | 'recap' | 'comeback';

/** One day on the metrics page's charts (ADMIN-06): account totals from adminStats, entries and minutes from stats. */
export interface MetricsDay { day: string; signUps: number; active7: number; logs: number; minutes: number }

/** The headline numbers of one adminStats day. */
export interface MetricsTiles {
  day: string; accounts: number; active1: number; active7: number; active28: number;
  activation: { of: number; logged: number }; retention: { of: number; active: number };
}

export interface Metrics { days: MetricsDay[]; latest: MetricsTiles | null; weekBefore: MetricsTiles | null }

/** The 30 India days ending yesterday, oldest first: the days the metrics page reads. */
export const metricsDays = (now: Date, n = 30) => Array.from({ length: n }, (_, i) => addDays(statsDay(now), i - n + 1));

type Doc = Record<string, unknown> | undefined;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const pair = <K extends string>(v: unknown, a: K, b: K) => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { [a]: num(o[a]), [b]: num(o[b]) } as Record<K, number>;
};

function tiles(day: string, d: Doc): MetricsTiles | null {
  if (!d?.computedAt) return null; // only email counts so far: the nightly job hasn't run for that day
  return {
    day, accounts: num(d.accounts), active1: num(d.active1), active7: num(d.active7), active28: num(d.active28),
    activation: pair(d.activation, 'of', 'logged'), retention: pair(d.retention, 'of', 'active'),
  };
}

/** The page's charts and tiles from each day's adminStats and stats documents (missing days count as zero). */
export function metricsFrom(days: string[], admin: Doc[], stats: Doc[]): Metrics {
  const series = days.map((day, i) => ({
    day, signUps: num(admin[i]?.signUps), active7: num(admin[i]?.active7), logs: num(stats[i]?.logs), minutes: num(stats[i]?.minutes),
  }));
  let latest: MetricsTiles | null = null, at = -1;
  for (let i = days.length - 1; i >= 0 && !latest; i--) { latest = tiles(days[i], admin[i]); at = i; }
  const weekBefore = latest && at >= 7 ? tiles(days[at - 7], admin[at - 7]) : null;
  return { days: series, latest, weekBefore };
}
