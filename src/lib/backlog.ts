import { addDays, parse, today } from './date';
import { sum } from './util';
import type { AppData, Category, DateStr, Log, Settings, Target } from './types';

// Per category, per day: carried(end) = max(0, carried(prev) + due(today) - logged(today)).
// Logging more than owed does not bank credit for future days.

export interface DayRow {
  date: DateStr;
  due: number;
  done: number;
  /** Carried in from previous days, after the backlog cap. */
  opening: number;
  owed: number;
  /** Still owed at the end of the day. */
  end: number;
}

export interface CategoryCalc {
  byDate: Map<DateStr, DayRow>;
  today: DayRow;
}

export interface Totals {
  due: number;
  opening: number;
  owed: number;
  end: number;
  /** Minutes done today, counting each practice only up to what it owed. */
  doneCap: number;
  done: number;
  /** Carried-over minutes not yet worked off today. */
  carryLeft: number;
}

export interface Calc {
  per: Record<string, CategoryCalc>;
  totals: Totals;
  /** Consecutive clear days (nothing pending at day end), counting today only if clear. */
  streak: number;
  best: number;
  /** Minutes logged, by category then date. */
  done: Record<string, Record<DateStr, number>>;
}

/** The target in force on `d`, falling back to the first one. */
export function targetOn(cat: Category, d: DateStr): Target | undefined {
  let t: Target | null = null;
  for (const x of cat.targets) if (x.from <= d) t = x;
  return t || cat.targets[0];
}

export function dueOn(cat: Category, d: DateStr): number {
  if (d < cat.startDate) return 0;
  if (cat.archivedFrom && d >= cat.archivedFrom) return 0;
  const t = targetOn(cat, d);
  return t && t.days.includes(parse(d).getDay()) ? t.minutes : 0;
}

export const targetMinutesOn = (cat: Category, d: DateStr) => targetOn(cat, d)?.minutes || 0;

export const capDays = (settings: Settings | undefined) => {
  const v = settings?.backlogCap;
  return v === undefined ? 2 : Number(v);
};

export const byOrder = (a: Category, b: Category) => (a.order ?? 0) - (b.order ?? 0);

export function activeCats(categories: Category[], asOf: DateStr = today()): Category[] {
  return categories.filter(c => !c.archivedFrom || c.archivedFrom > asOf).sort(byOrder);
}

export function calc(data: AppData, asOf: DateStr = today()): Calc {
  const done: Calc['done'] = {};
  for (const l of data.logs) { (done[l.catId] ||= {}); done[l.catId][l.date] = (done[l.catId][l.date] || 0) + l.minutes; }
  const per: Calc['per'] = {}, cd = capDays(data.settings);
  for (const c of data.categories) {
    let carry = 0, last: DayRow | null = null;
    const byDate = new Map<DateStr, DayRow>();
    for (let d = c.startDate; d <= asOf; d = addDays(d, 1)) {
      const due = dueOn(c, d), dn = (done[c.id] || {})[d] || 0;
      if (c.archivedFrom && d >= c.archivedFrom) carry = 0;
      if (cd > 0) carry = Math.min(carry, cd * targetMinutesOn(c, d)); // older misses beyond the cap are forgiven
      const row: DayRow = { date: d, due, done: dn, opening: carry, owed: carry + due, end: Math.max(0, carry + due - dn) };
      byDate.set(d, row); carry = row.end; last = row;
    }
    per[c.id] = { byDate, today: last && last.date === asOf ? last : { date: asOf, due: 0, done: (done[c.id] || {})[asOf] || 0, opening: 0, owed: 0, end: 0 } };
  }
  const act = activeCats(data.categories, asOf);
  const t = (k: keyof DayRow) => sum(act.map(c => per[c.id].today[k] as number));
  const totals: Totals = {
    due: t('due'), opening: t('opening'), owed: t('owed'), end: t('end'),
    doneCap: sum(act.map(c => Math.min(per[c.id].today.done, per[c.id].today.owed))),
    done: t('done'),
    carryLeft: sum(act.map(c => Math.max(0, per[c.id].today.opening - per[c.id].today.done))),
  };
  const dayEnd = (d: DateStr) => sum(data.categories.map(c => per[c.id].byDate.get(d)?.end || 0));
  const dayDue = (d: DateStr) => sum(data.categories.map(c => per[c.id].byDate.get(d)?.owed || 0));
  const earliest = data.categories.reduce((m, c) => c.startDate < m ? c.startDate : m, asOf);
  let streak = 0, d = dayEnd(asOf) === 0 && totals.owed > 0 ? asOf : addDays(asOf, -1);
  while (d >= earliest && dayEnd(d) === 0) { if (dayDue(d) > 0) streak++; d = addDays(d, -1); }
  let best = 0, run = 0;
  for (let x = earliest; x < asOf; x = addDays(x, 1)) { if (dayEnd(x) === 0) { if (dayDue(x) > 0) run++; } else run = 0; best = Math.max(best, run); }
  best = Math.max(best, streak);
  return { per, totals, streak, best, done };
}

/** Totals across all categories for one day. */
export function dayAll(c: Calc, categories: Category[], d: DateStr) {
  let due = 0, done = 0, end = 0, owed = 0;
  for (const cat of categories) { const r = c.per[cat.id]?.byDate.get(d); if (!r) continue; due += r.due; done += r.done; end += r.end; owed += r.owed; }
  return { d, due, done, end, owed };
}

/** Days in a row with at least one entry, counting today only if it has one. */
export function showUpStreak(logs: Log[], asOf: DateStr = today()): number {
  const days = new Set(logs.filter(l => l.minutes > 0).map(l => l.date));
  let n = 0, d = days.has(asOf) ? asOf : addDays(asOf, -1);
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** Median hour this practice was logged over the last 30 days, or null with fewer than 5 entries. */
export function usualHour(logs: Log[], catId: string, asOf: DateStr = today()): number | null {
  const since = addDays(asOf, -30);
  const hs = logs.filter(l => l.catId === catId && l.date >= since && l.createdAt).map(l => new Date(l.createdAt).getHours()).sort((a, b) => a - b);
  return hs.length >= 5 ? hs[Math.floor(hs.length / 2)] : null;
}
