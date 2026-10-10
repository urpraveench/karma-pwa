// The weekly recap's numbers (NOTIF-06): last week, Monday to Sunday, from an account's practices and entries.
// Pure, so it's unit-tested (tests/recap.test.ts). Follows the app's rules (src/lib/backlog.ts): a practice is due on
// its target's weekdays from its start date until it's archived. Dates are 'YYYY-MM-DD' strings, handled in UTC so
// the server's own time zone never shifts a day.

export interface RecapTarget { from: string; minutes: number; days: number[] }
export interface RecapCategory { id: string; name: string; color?: string; order?: number; startDate: string; archivedFrom?: string | null; targets: RecapTarget[] }
export interface RecapLog { catId: string; date: string; minutes: number }

export interface RecapPractice { name: string; color?: string; done: number; target: number }
export interface Recap {
  /** Monday and Sunday of the week the recap covers. */
  start: string;
  end: string;
  done: number;
  target: number;
  /** Minutes logged the week before, or null if TikTym wasn't in use yet. */
  prev: number | null;
  /** Days with an entry, out of the week's days since the account began (7 for a full week). */
  daysShown: number;
  days: number;
  best: { date: string; minutes: number } | null;
  /** Days in a row with an entry, up to the Sunday. */
  streak: number;
  practices: RecapPractice[];
}

const DAY = 86_400_000;
const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(at(d) + n * DAY).toISOString().slice(0, 10);
const weekday = (d: string) => new Date(at(d)).getUTCDay();

/** The Monday that starts last week, from the instant the recap runs, in India time (UTC+5:30). */
export function lastWeekStart(now: Date): string {
  const today = new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const sinceMonday = (weekday(today) + 6) % 7;
  return addDays(today, -sinceMonday - 7);
}

function targetOn(c: RecapCategory, d: string): RecapTarget | undefined {
  let t: RecapTarget | undefined;
  for (const x of c.targets) if (x.from <= d) t = x;
  return t || c.targets[0];
}

/** Minutes a practice is due on a day (as the app counts it, without carry-forward). */
export function dueOn(c: RecapCategory, d: string): number {
  if (d < c.startDate || (c.archivedFrom && d >= c.archivedFrom)) return 0;
  const t = targetOn(c, d);
  return t && t.days.includes(weekday(d)) ? t.minutes : 0;
}

/**
 * The recap for the week starting `start` (a Monday), or null if nothing was logged in that week or the one before:
 * only people who used TikTym in the last two weeks get one.
 */
export function weekRecap(cats: RecapCategory[], logs: RecapLog[], start: string): Recap | null {
  const end = addDays(start, 6), prevStart = addDays(start, -7);
  const real = logs.filter(l => l.minutes > 0);
  if (!real.some(l => l.date >= prevStart && l.date <= end)) return null;
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const inWeek = real.filter(l => l.date >= start && l.date <= end);
  const sum = (ls: RecapLog[]) => ls.reduce((s, l) => s + l.minutes, 0);

  const practices = [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(c => ({ name: c.name, color: c.color, done: sum(inWeek.filter(l => l.catId === c.id)), target: week.reduce((s, d) => s + dueOn(c, d), 0) }))
    .filter(p => p.target > 0 || p.done > 0);

  const began = [...cats.map(c => c.startDate), ...real.map(l => l.date)].sort()[0] ?? start;
  const byDay = week.map(d => ({ date: d, minutes: sum(inWeek.filter(l => l.date === d)) }));
  const best = byDay.reduce<Recap['best']>((b, x) => (x.minutes > (b?.minutes ?? 0) ? x : b), null);

  const shown = new Set(real.map(l => l.date));
  let streak = 0;
  for (let d = end; shown.has(d); d = addDays(d, -1)) streak++;

  return {
    start, end,
    done: sum(inWeek),
    target: practices.reduce((s, p) => s + p.target, 0),
    prev: began < start ? sum(real.filter(l => l.date >= prevStart && l.date < start)) : null,
    daysShown: byDay.filter(x => x.minutes > 0).length,
    days: week.filter(d => d >= began).length,
    best, streak, practices,
  };
}

export type Suggestion = { kind: 'quiet' | 'lowest' | 'all-met'; practice?: RecapPractice };

/**
 * One gentle suggestion: after a week with nothing logged, start small; otherwise, the practice furthest from its
 * target gets a nudge; if every target was met, keep the rhythm.
 */
export function suggestion(r: Recap): Suggestion {
  if (r.done === 0) return { kind: 'quiet' };
  const behind = r.practices.filter(p => p.target > 0 && p.done < p.target).sort((a, b) => a.done / a.target - b.done / b.target);
  return behind.length ? { kind: 'lowest', practice: behind[0] } : { kind: 'all-met' };
}

// --- who gets one, at any size (NOTIF-16) ---

/** The oldest last-logged date that still gets the recap for the week starting `week`: an entry that week or the one before. */
export const recapFrom = (week: string) => addDays(week, -7);

/** What mail/{uid} says about one recap: lastLogged (newest entry), recapWeek (last week sent), lastEmailDay (India date). */
export interface RecapMail { lastLogged?: string; recapWeek?: string; lastEmailDay?: string }

/**
 * Whether a queued recap still goes when its turn comes: not twice for the same week (a retried job or task), not to
 * someone with no entry in the two weeks, and not on a day another TikTym email already went to them (NOTIF-08).
 */
export function recapCheck(m: RecapMail | undefined, week: string, today: string): 'send' | 'sent' | 'inactive' | 'emailed-today' {
  if (m?.recapWeek === week) return 'sent';
  if (!m?.lastLogged || m.lastLogged < recapFrom(week)) return 'inactive';
  if (m.lastEmailDay === today) return 'emailed-today';
  return 'send';
}
