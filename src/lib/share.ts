import type { Calc } from './backlog';
import { parse } from './date';
import { sum } from './util';
import type { AppData, DateStr } from './types';

// What the shareable progress card shows (SHARE-01). Pure, so it can be tested on its own.

export interface CardPractice { name: string; color: string; minutes: number }
export interface CardStats {
  month: string;          // "October"
  minutes: number;        // logged this calendar month
  streak: number;
  best: number;
  activeDays: number;     // days this month with at least one entry
  entries: number;        // entries this month
  top: CardPractice[];    // up to three, most time first
}

export function cardStats(data: AppData, c: Calc, T: DateStr): CardStats {
  const ym = T.slice(0, 7);
  const thisMonth = data.logs.filter(l => l.date.startsWith(ym) && l.date <= T && l.minutes > 0);
  const byCat = new Map<string, number>();
  for (const l of thisMonth) byCat.set(l.catId, (byCat.get(l.catId) || 0) + l.minutes);
  const top = [...byCat.entries()]
    .map(([id, minutes]) => ({ cat: data.categories.find(x => x.id === id), minutes }))
    .filter((x): x is { cat: NonNullable<typeof x.cat>; minutes: number } => !!x.cat)
    .sort((a, b) => b.minutes - a.minutes || (a.cat.order ?? 0) - (b.cat.order ?? 0))
    .slice(0, 3)
    .map(x => ({ name: x.cat.name, color: x.cat.color, minutes: x.minutes }));
  return {
    month: parse(T).toLocaleDateString(undefined, { month: 'long' }),
    minutes: sum(thisMonth.map(l => l.minutes)),
    streak: c.streak,
    best: c.best,
    activeDays: new Set(thisMonth.map(l => l.date)).size,
    entries: thisMonth.length,
    top,
  };
}

/** "45 min", "3.5 h", "47 h". */
export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return h < 10 ? `${(Math.round(h * 10) / 10).toString()} h` : `${Math.round(h)} h`;
}

/** The card's first stat: the current streak; with none, the best streak; with neither, this month's entries. A card never shows "0-day streak". */
export function streakStat(s: CardStats): { value: number; label: string } {
  if (s.streak > 0) return { value: s.streak, label: 'day streak' };
  if (s.best > 0) return { value: s.best, label: 'day best streak' };
  return { value: s.entries, label: s.entries === 1 ? 'entry this month' : 'entries this month' };
}
