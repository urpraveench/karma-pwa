import { addDays, parse } from './date';
import type { Calc } from './backlog';
import type { Category, DateStr } from './types';

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

/** The share of scheduled practice-days from `from` to `to` where the day's own target was met, or null if nothing was due (LVL-02). */
export function score(c: Calc, categories: Category[], from: DateStr, to: DateStr): number | null {
  let due = 0, met = 0;
  for (let d = from; d <= to; d = addDays(d, 1))
    for (const cat of categories) {
      const r = c.per[cat.id]?.byDate.get(d);
      if (r && r.due > 0) { due++; if (r.done >= r.due) met++; }
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
export function levels(c: Calc, categories: Category[], asOf: DateStr, from: DateStr = LEVELS_FROM): Levels | null {
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
