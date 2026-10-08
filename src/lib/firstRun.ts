import { COLORS, newId } from './util';
import type { Category, DateStr } from './types';

// Choosing practices before day one (FIRST-01, FIRST-08 to FIRST-10).

export interface Choice { name: string; minutes: number; picked: boolean }

/** Suggestions for working professionals, with daily minutes. The first four are ticked: the old defaults. */
export const SUGGESTIONS: readonly (readonly [string, number])[] = [
  ['Exercise', 30], ['Reading', 30], ['Course study', 30], ['Meditation', 10],
  ['Coding practice', 30], ['Language learning', 15], ['Journaling', 10], ['Walking', 20],
];
const TICKED = 4;
export const MIN_MINUTES = 5, MAX_MINUTES = 240, STEP = 5, OWN_MINUTES = 20;

export const firstChoices = (): Choice[] => SUGGESTIONS.map(([name, minutes], i) => ({ name, minutes, picked: i < TICKED }));

/** Changes a ticked practice's minutes by `by`, kept between 5 and 240 (FIRST-09). */
export const stepMinutes = (cs: Choice[], i: number, by: number): Choice[] =>
  cs.map((c, k) => k === i ? { ...c, minutes: Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, c.minutes + by)) } : c);

/** Adds your own practice, ticked; a name already on the list ticks that one instead (FIRST-10). */
export function addOwn(cs: Choice[], raw: string): Choice[] {
  const name = raw.trim().slice(0, 40);
  if (!name) return cs;
  const i = cs.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  if (i >= 0) return cs.map((c, k) => k === i ? { ...c, picked: true } : c);
  return [...cs, { name, minutes: OWN_MINUTES, picked: true }];
}

/** Practices for the ticked choices, every day from `start`, in the order shown, each in the next colour. */
export function startingCategories(choices: Pick<Choice, 'name' | 'minutes'>[], start: DateStr): Category[] {
  return choices.map(({ name, minutes }, i) => ({
    id: newId(), name, color: COLORS[i % COLORS.length], order: i, startDate: start, archivedFrom: null,
    targets: [{ from: start, minutes, days: [0, 1, 2, 3, 4, 5, 6] }],
  }));
}
