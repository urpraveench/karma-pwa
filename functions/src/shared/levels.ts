// Generated from src/lib/levels.ts by `npm run functions:shared`. Don't edit: change src/lib/levels.ts and run it again.
import { addDays, fmtLong, parse } from './date.js';
import type { Calc, DayRow } from './backlog.js';
import type { Category, DateStr } from './types.js';

// Levels set how strict streaks and shields are (LVL-01). They're worked out from history every time, like shields, so
// nothing is stored and the server gets the same answer: the score of past days decides each Monday's move.

/** The day levels began. A day before it isn't judged by any level; set to the release date when levels ship. */
export const LEVELS_FROM: DateStr = '2026-10-19';
export const LEVEL_MAX = 10;
/** The score each level needs, as a whole percent (Level 1 needs nothing) (LVL-01). */
export const THRESHOLD = [0, 0, 15, 25, 35, 45, 55, 65, 75, 85, 93];
/** How far under its own threshold a level's score can fall before it moves down, so it doesn't flip back and forth (LVL-05). */
export const DROP_GAP = 10;
/** Days of history a weekly move looks at, and an existing account's starting level (LVL-04, LVL-05). */
export const MOVE_DAYS = 14, START_DAYS = 28, START_MIN_DAYS = 7;
export const TIERS = ['Starting', 'Building', 'Steady', 'Strong', 'Relentless'] as const;
export type Tier = typeof TIERS[number];
export const tierOf = (level: number): Tier => TIERS[Math.ceil(level / 2) - 1];
/** The tier whose voice to use: Steady before levels began (COACH-01). */
export const tierAt = (lv: Pick<Levels, 'level'> | null | undefined): Tier => lv ? tierOf(lv.level) : 'Steady';

/**
 * What a level asks of a day to count as clear (LVL-06): 'any5' 5+ minutes on any practice; 'minimum' one practice's small
 * minimum; 'half' and 'most' half and three quarters of the day's targets; 'targets' every target met, carried-over minutes
 * not needed; 'all' every target and every carried-over minute (the rule before levels).
 */
export type ClearRule = 'any5' | 'minimum' | 'half' | 'most' | 'targets' | 'all';
export interface LevelRule {
  clear: ClearRule; shieldDays: number; shieldMax: number; startShield?: boolean;
  /** Missed days a practice streak survives, and in how many days (LVL-09). */
  misses?: [number, number];
  /** Days of target a practice carries into a new day unless the person picked a limit; 0 = no limit (LVL-10). */
  cap: number;
}
/** By level, index 1 to 10 (LVL-06, LVL-07). Level 6 is the rule before levels. */
export const RULES: LevelRule[] = [
  { clear: 'all', shieldDays: 3, shieldMax: 3, cap: 2 },
  { clear: 'any5', shieldDays: 2, shieldMax: 5, startShield: true, misses: [2, 7], cap: 1 },
  { clear: 'minimum', shieldDays: 2, shieldMax: 5, startShield: true, misses: [2, 7], cap: 1 },
  { clear: 'half', shieldDays: 2, shieldMax: 4, misses: [1, 7], cap: 1 },
  { clear: 'most', shieldDays: 3, shieldMax: 4, misses: [1, 7], cap: 2 },
  { clear: 'targets', shieldDays: 3, shieldMax: 3, misses: [1, 14], cap: 2 },
  { clear: 'all', shieldDays: 3, shieldMax: 3, cap: 2 },
  { clear: 'all', shieldDays: 4, shieldMax: 2, cap: 3 },
  { clear: 'all', shieldDays: 5, shieldMax: 2, cap: 3 },
  { clear: 'all', shieldDays: 6, shieldMax: 1, cap: 0 },
  { clear: 'all', shieldDays: 7, shieldMax: 1, cap: 0 },
];
/** The level whose rules applied before levels began. */
export const BEFORE_LEVELS = 6;

/** A practice's small minimum for a day: half its target, rounded to 5, from 5 to 15 minutes, never more than the target. */
export const minimumOf = (due: number) => Math.min(due, Math.max(5, Math.min(15, Math.round(due / 10) * 5)));

/** Whether a day was clear, missed or had nothing due, by a level's rule; `rows` are that day's rows, one per practice (LVL-06). */
export function dayState(rule: ClearRule, rows: DayRow[]): 'clear' | 'miss' | 'rest' {
  const due = rows.reduce((n, r) => n + r.due, 0);
  if (rule === 'all') return rows.every(r => r.owed === 0) ? 'rest' : rows.every(r => r.end === 0) ? 'clear' : 'miss';
  if (due === 0) return 'rest';
  return keepLeft(rule, rows) === 0 ? 'clear' : 'miss';
}

/** Minutes still needed for a day to count as clear by a level's rule (TODAY-13). */
export function keepLeft(rule: ClearRule, rows: DayRow[]): number {
  const due = rows.filter(r => r.due > 0), doneCap = due.reduce((n, r) => n + Math.min(r.done, r.due), 0), all = due.reduce((n, r) => n + r.due, 0);
  switch (rule) {
    case 'all': return rows.reduce((n, r) => n + r.end, 0);
    case 'targets': return all - doneCap;
    case 'half': case 'most': return Math.max(0, Math.ceil(all * (rule === 'half' ? .5 : .75)) - doneCap);
    case 'minimum': return due.length ? Math.max(0, Math.min(...due.map(r => minimumOf(r.due) - r.done))) : 0;
    case 'any5': return Math.max(0, 5 - Math.max(0, ...rows.map(r => r.done)));
  }
}

/** What a level's clear day asks, in a sentence for the Streak sheet (TODAY-20). */
export const CLEAR_SAYS: Record<ClearRule, string> = {
  any5: 'A day is clear when you do 5 minutes or more on any practice.',
  minimum: 'A day is clear when one practice gets its small minimum: half its target, 5 to 15 minutes.',
  half: "A day is clear when you do half of the day's targets.",
  most: "A day is clear when you do three quarters of the day's targets.",
  targets: "A day is clear when every practice meets the day's target. Carried-over minutes can wait.",
  all: 'A day is clear when every practice is done, carried-over minutes included.',
};

/** How a level's shields work, in a sentence for the Streak sheet (TODAY-20). */
export const shieldSays = (r: LevelRule) =>
  `Every ${r.shieldDays} clear days in a row earn a shield, and you can hold ${r.shieldMax}. Miss a day and a shield keeps your streak; the minutes still carry over.`;

/** The level on day `d`: the one before levels for a day before they began (LVL-08). */
export function levelOn(lv: Levels | null, d: DateStr): number {
  if (!lv || d < lv.moves[0].date) return BEFORE_LEVELS;
  let l = lv.moves[0].level;
  for (const m of lv.moves) if (m.date <= d) l = m.level;
  return l;
}

/**
 * Days in a row a practice was kept, each day judged by its level's rule on that practice alone; today counts once kept.
 * Below Level 6 a few missed days don't end it (they don't count either): as many as the level allows in any stretch of
 * its days (LVL-09).
 */
export function practiceStreak(rows: Map<DateStr, DayRow>, lv: Levels | null, T: DateStr): number {
  let st = 0;
  const missed: DateStr[] = [];
  for (let d = T, r = rows.get(d); r; d = addDays(d, -1), r = rows.get(d)) {
    const rule = RULES[levelOn(lv, d)], s = dayState(rule.clear, [r]);
    if (s === 'clear') st++;
    else if (s === 'miss' && d !== T) {
      const [n, days] = rule.misses ?? [0, 1], end = addDays(d, days);
      if (missed.filter(m => m < end).length >= n) break;
      missed.push(d);
    }
  }
  return st;
}

/** A practice-day counts as on target from this share of its own target, so 25 of 30 minutes isn't a zero (LVL-02). */
export const ON_TARGET = .8;

/** The share of scheduled practice-days from `from` to `to` that were on target, or null if nothing was due (LVL-02). */
export function score(c: Pick<Calc, 'per'>, categories: Category[], from: DateStr, to: DateStr): number | null {
  let due = 0, met = 0;
  for (let d = from; d <= to; d = addDays(d, 1))
    for (const cat of categories) {
      const r = c.per[cat.id]?.byDate.get(d);
      if (r && r.due > 0) { due++; if (r.done >= r.due * ON_TARGET) met++; }
    }
  return due ? Math.round(met / due * 100) : null;
}

/** The highest level whose threshold a score reaches. */
export const levelFor = (pct: number) => { let l = 1; while (l < LEVEL_MAX && pct >= THRESHOLD[l + 1]) l++; return l; };

/** The first Monday after `d`. */
export const nextMonday = (d: DateStr) => addDays(d, (8 - parse(d).getDay()) % 7 || 7);

export interface LevelMove { date: DateStr; level: number }
export interface Levels {
  level: number;
  /** Every level held since levels began, oldest first: the starting level, then each Monday's move. */
  moves: LevelMove[];
  /** The last 14 days' score, up to yesterday. */
  score: number | null;
  /** The next Monday that looks at the score: the first one with 14 days of history behind it. */
  nextCheck: DateStr;
}

/** The level on `asOf`, or null before levels began (LVL-03 to LVL-05). */
export function levels(c: Pick<Calc, 'per'>, categories: Category[], asOf: DateStr, from: DateStr = LEVELS_FROM): Levels | null {
  if (asOf < from || !categories.length) return null;
  const start = categories.reduce((m, x) => x.startDate < m ? x.startDate : m, asOf);
  const later = (a: DateStr, b: DateStr) => a > b ? a : b;
  let level = 1;
  if (start < from && start <= addDays(from, -START_MIN_DAYS)) {
    const s = score(c, categories, later(start, addDays(from, -START_DAYS)), addDays(from, -1));
    if (s !== null) level = levelFor(s);
  }
  const moves: LevelMove[] = [{ date: later(start, from), level }];
  for (let m = nextMonday(moves[0].date); m <= asOf; m = addDays(m, 7)) {
    if (addDays(m, -MOVE_DAYS) < start) continue;
    const s = score(c, categories, addDays(m, -MOVE_DAYS), addDays(m, -1));
    if (s === null) continue;
    const next = level < LEVEL_MAX && s >= THRESHOLD[level + 1] ? level + 1 : level > 1 && s < THRESHOLD[level] - DROP_GAP ? level - 1 : level;
    if (next !== level) moves.push({ date: m, level: level = next });
  }
  let nextCheck = nextMonday(asOf);
  while (addDays(nextCheck, -MOVE_DAYS) < start) nextCheck = addDays(nextCheck, 7);
  return { level, moves, score: score(c, categories, later(start, addDays(asOf, -MOVE_DAYS)), addDays(asOf, -1)), nextCheck };
}

/** What the level's score is, and what reaches the next level or keeps the top one (TODAY-22, LVL-12). */
export function levelText(lv: Levels): { text: string; fill: number } {
  const on = lv.score === null ? '' : `${lv.score}% of your practice days on target in the last 14 days. `;
  if (lv.level === LEVEL_MAX) return { text: `${on}Stay at ${THRESHOLD[LEVEL_MAX] - DROP_GAP}% or more to keep Level ${LEVEL_MAX}.`, fill: lv.score ?? 0 };
  const need = THRESHOLD[lv.level + 1], fill = Math.min(100, (lv.score ?? 0) / need * 100);
  if (lv.level > 1 && lv.score !== null && lv.score < THRESHOLD[lv.level])
    return { text: `${on}Stay at ${THRESHOLD[lv.level] - DROP_GAP}% or more to keep Level ${lv.level}; reach ${need}% to move up.`, fill };
  return { text: `${on}Reach ${need}% and on ${fmtLong(lv.nextCheck)} you move up to Level ${lv.level + 1}.`, fill };
}
