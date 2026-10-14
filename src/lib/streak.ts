import type { Calc } from './backlog';
import { addDays, parse } from './date';
import type { Category, DateStr } from './types';

// The streak calendar (CALC-15, TODAY-20): what each day did for the streak, for the week dots on Today and the
// month in the Streak sheet. Worked out from the same calc as the streak itself, so the two always agree.

/**
 * clear: met its level's rule (extends the streak, LVL-06). shield: missed, but a shield kept the streak. miss: missed.
 * rest: nothing due (neither extends nor breaks it). today: today, not clear yet. future, before: outside the history.
 */
export type DayMark = 'clear' | 'shield' | 'miss' | 'rest' | 'today' | 'future' | 'before';

export function dayMark(c: Calc, categories: Category[], d: DateStr, T: DateStr): DayMark {
  if (d > T) return 'future';
  if (!categories.length || d < categories.reduce((m, x) => x.startDate < m ? x.startDate : m, T)) return 'before';
  const st = c.days.get(d);
  if (!st || st === 'rest') return 'rest';
  if (st === 'clear') return 'clear';
  if (d === T) return 'today';
  return c.shielded.includes(d) ? 'shield' : 'miss';
}

/** Monday of the week `d` is in. */
export const weekStart = (d: DateStr) => addDays(d, -((parse(d).getDay() + 6) % 7));

/** The month `month` ('YYYY-MM') as weeks, Monday first; days outside the month are null. */
export function monthWeeks(month: string): (DateStr | null)[][] {
  const first = `${month}-01`, weeks: (DateStr | null)[][] = [];
  for (let d = weekStart(first); d.slice(0, 7) <= month; d = addDays(d, 7))
    weeks.push(Array.from({ length: 7 }, (_, i) => { const x = addDays(d, i); return x.slice(0, 7) === month ? x : null; }));
  return weeks;
}

/** The month `n` months after `month` ('YYYY-MM'). */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number), t = y * 12 + m - 1 + n;
  return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`;
}

/** The line under the shields: how far off the next one is, or that all are held. */
export function nextShieldText(c: Calc, todayClear: boolean): string {
  const max = c.rule.shieldMax;
  if (c.shields >= max) return max === 1 ? 'You hold your shield, the most you can at this level.' : `You hold ${max} shields, the most you can${c.level ? ' at this level' : ''}.`;
  const left = Math.max(1, c.rule.shieldDays - c.shieldDays);
  if (left === 1) return todayClear ? 'Clear tomorrow to earn a shield.' : 'Clear today to earn a shield.';
  return `${left} more clear days in a row earn a shield.`;
}
