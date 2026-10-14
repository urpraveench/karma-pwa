import { addDays, parse, today } from './date';
import { dayState, keepLeft, LEVELS_FROM, levelOn, levels, RULES, type LevelRule, type Levels } from './levels';
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
  /** Carried-over minutes still owed beyond today's own target (CALC-13). */
  carryLeft: number;
}

export interface Calc {
  per: Record<string, CategoryCalc>;
  totals: Totals;
  /** Consecutive clear days by each day's level (LVL-06), counting today only once clear. */
  streak: number;
  best: number;
  /** Streak shields held now (CALC-14). */
  shields: number;
  /** Missed days a shield covered, oldest first. */
  shielded: DateStr[];
  /** Clear days so far towards the next shield. */
  shieldDays: number;
  /** The level now and how it got there, or null before levels began (LVL-01 to LVL-05). */
  level: Levels | null;
  /** The rules of today's level (LVL-06, LVL-07). */
  rule: LevelRule;
  /** What each day did for the streak by its level's rule, from the first practice's start (CALC-15). */
  days: Map<DateStr, 'clear' | 'miss' | 'rest'>;
  /** Minutes still needed today to count as clear (TODAY-13). */
  keepLeft: number;
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

/** What's left of the day's own target: minutes logged count toward it before the backlog (CALC-16). */
export const dueLeft = (r: DayRow) => Math.max(0, r.due - r.done);
/** Carried-over minutes still owed once the day's own target is counted (CALC-13). */
export const carriedLeft = (r: DayRow) => r.end - dueLeft(r);

/** The backlog limit the person picked, or null to follow the level (2 days before levels) (LVL-10). */
export const capDays = (settings: Settings | undefined): number | null => {
  const v = settings?.backlogCap;
  return v === undefined || v === null || Number(v) < 0 ? null : Number(v);
};


export const byOrder = (a: Category, b: Category) => (a.order ?? 0) - (b.order ?? 0);

export function activeCats(categories: Category[], asOf: DateStr = today()): Category[] {
  return categories.filter(c => !c.archivedFrom || c.archivedFrom > asOf).sort(byOrder);
}

export function calc(data: AppData, asOf: DateStr = today(), levelsFrom: DateStr = LEVELS_FROM): Calc {
  const done: Calc['done'] = {};
  for (const l of data.logs) { (done[l.catId] ||= {}); done[l.catId][l.date] = (done[l.catId][l.date] || 0) + l.minutes; }
  const per: Calc['per'] = {}, picked = capDays(data.settings);
  for (const c of data.categories) {
    const byDate = new Map<DateStr, DayRow>();
    for (let d = c.startDate; d <= asOf; d = addDays(d, 1))
      byDate.set(d, { date: d, due: dueOn(c, d), done: (done[c.id] || {})[d] || 0, opening: 0, owed: 0, end: 0 });
    per[c.id] = { byDate, today: byDate.get(asOf) ?? { date: asOf, due: 0, done: (done[c.id] || {})[asOf] || 0, opening: 0, owed: 0, end: 0 } };
  }
  // The level only looks at what was due and done, never at the backlog or the streak, so it comes first (LVL-05) and
  // the backlog limit can follow it (LVL-10).
  const level = levels({ per }, data.categories, asOf, levelsFrom);
  for (const c of data.categories) {
    let carry = 0;
    for (const row of per[c.id].byDate.values()) {
      const d = row.date, cd = picked ?? RULES[levelOn(level, d)].cap;
      if (c.archivedFrom && d >= c.archivedFrom) carry = 0;
      if (cd > 0) carry = Math.min(carry, cd * targetMinutesOn(c, d)); // older misses beyond the cap are forgiven
      row.opening = carry; row.owed = carry + row.due; row.end = Math.max(0, row.owed - row.done);
      carry = row.end;
    }
  }
  const act = activeCats(data.categories, asOf);
  const t = (k: keyof DayRow) => sum(act.map(c => per[c.id].today[k] as number));
  const totals: Totals = {
    due: t('due'), opening: t('opening'), owed: t('owed'), end: t('end'),
    doneCap: sum(act.map(c => Math.min(per[c.id].today.done, per[c.id].today.owed))),
    done: t('done'),
    carryLeft: sum(act.map(c => carriedLeft(per[c.id].today))),
  };
  const rowsOn = (d: DateStr) => data.categories.flatMap(c => { const r = per[c.id].byDate.get(d); return r ? [r] : []; });
  const earliest = data.categories.reduce((m, c) => c.startDate < m ? c.startDate : m, asOf);
  // One pass, oldest first, each day judged by its own level's rule. Enough clear days in a row earn a shield (up to the
  // level's most); a missed day spends one instead of breaking the streak, and counts towards neither. Today counts only
  // once clear, and never spends one: it isn't over. A level that holds fewer shields trims the extra (LVL-07).
  let streak = 0, best = 0, shields = 0, week = 0, prev = 0;
  const shielded: DateStr[] = [], days: Calc['days'] = new Map();
  for (let x = earliest; x <= asOf; x = addDays(x, 1)) {
    const l = levelOn(level, x), R = RULES[l];
    if (l !== prev) {
      shields = Math.min(shields, R.shieldMax);
      if (R.startShield && level && x === level.moves[0].date) shields = Math.max(shields, 1);
      prev = l;
    }
    const st = dayState(R.clear, rowsOn(x));
    days.set(x, st);
    if (st === 'clear') { streak++; if (++week >= R.shieldDays) { week = 0; shields = Math.min(R.shieldMax, shields + 1); } }
    else if (st === 'rest') { /* nothing due: neither extends nor breaks the streak */ }
    else if (x === asOf) break;
    else if (shields > 0) { shields--; week = 0; shielded.push(x); }
    else { streak = 0; week = 0; }
    best = Math.max(best, streak);
  }
  const rule = RULES[levelOn(level, asOf)];
  return { per, totals, streak, best, shields, shielded, shieldDays: week, done, level, rule, days, keepLeft: keepLeft(rule.clear, rowsOn(asOf)) };
}

/**
 * Practices with minutes still due today (carried-over minutes included), in the order shown. A practice logged only
 * partly still counts. The reminder and the app badge use this, on the server too (NOTIF-10, NOTIF-13).
 */
export function practicesLeft(data: AppData, asOf: DateStr = today(), c: Calc = calc(data, asOf)): Category[] {
  return activeCats(data.categories, asOf).filter(cat => c.per[cat.id].today.end > 0);
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
