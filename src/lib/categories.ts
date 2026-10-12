import { byOrder } from './backlog';
import { newId } from './util';
import type { Category, DateStr } from './types';

export interface CategoryForm {
  name: string;
  color: string;
  minutes: number;
  days: number[];
  start: DateStr;
  /** The practice's own reminder time ('HH:MM'), or none (PRAC-24). */
  remind?: string | null;
}

export function newCategory(f: CategoryForm, order: number): Category {
  return {
    id: newId(), name: f.name, color: f.color, order, startDate: f.start, archivedFrom: null, targets: [{ from: f.start, minutes: f.minutes, days: [...f.days].sort() }],
    ...(f.remind ? { remind: f.remind } : {}),
  };
}

/**
 * Applies an edit. A new target (minutes or days) applies from `today`, so past days keep their old target;
 * a second edit on the same day replaces that day's target. Moving the start date drops targets that no longer apply.
 */
export function editCategory(existing: Category, f: CategoryForm, today: DateStr): Category {
  const cat: Category = structuredClone(existing);
  cat.name = f.name; cat.color = f.color; cat.startDate = f.start;
  if (f.remind) cat.remind = f.remind; else delete cat.remind;
  const t = { from: today, minutes: f.minutes, days: [...f.days].sort() };
  const last = cat.targets[cat.targets.length - 1];
  if (last.minutes !== t.minutes || last.days.join() !== t.days.join()) {
    if (last.from >= today) cat.targets[cat.targets.length - 1] = { ...t, from: last.from };
    else cat.targets.push(t);
  }
  cat.targets[0].from = f.start;
  cat.targets = cat.targets.filter((x, i) => i === 0 || x.from > f.start);
  return cat;
}

/** The order for a new practice: after every existing one, even when deletions left gaps (PRAC-20). */
export const nextOrder = (cats: Category[]) => cats.reduce((m, c) => Math.max(m, (c.order ?? 0) + 1), 0);

/**
 * Moves a practice one place up (-1) or down (1) in the list (PRAC-22). Returns only the practices whose order
 * changed, renumbered 0, 1, 2… so ties or gaps from older data are tidied up too. Empty at either end (PRAC-23).
 */
export function moveCategory(cats: Category[], id: string, dir: -1 | 1): Category[] {
  const list = [...cats].sort(byOrder);
  const i = list.findIndex(c => c.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  return list.flatMap((c, k) => c.order === k ? [] : [{ ...c, order: k }]);
}
