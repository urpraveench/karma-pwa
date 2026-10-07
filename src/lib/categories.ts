import { newId } from './util';
import type { Category, DateStr } from './types';

export interface CategoryForm {
  name: string;
  color: string;
  minutes: number;
  days: number[];
  start: DateStr;
}

export function newCategory(f: CategoryForm, order: number): Category {
  return { id: newId(), name: f.name, color: f.color, order, startDate: f.start, archivedFrom: null, targets: [{ from: f.start, minutes: f.minutes, days: [...f.days].sort() }] };
}

/**
 * Applies an edit. A new target (minutes or days) applies from `today`, so past days keep their old target;
 * a second edit on the same day replaces that day's target. Moving the start date drops targets that no longer apply.
 */
export function editCategory(existing: Category, f: CategoryForm, today: DateStr): Category {
  const cat: Category = structuredClone(existing);
  cat.name = f.name; cat.color = f.color; cat.startDate = f.start;
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
