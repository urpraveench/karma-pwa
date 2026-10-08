import type { AppData, Category, Log, Settings } from './types';

/** A change the app has made but Firebase hasn't confirmed yet (SYNC-16). */
export type Change =
  | { m: 'addLog'; l: Log }
  | { m: 'deleteLog'; l: Pick<Log, 'id' | 'date'> }
  | { m: 'updateLog'; prev: Pick<Log, 'id' | 'date'>; next: Log }
  | { m: 'putCategory'; c: Category }
  | { m: 'putSettings'; s: Settings };

/** Freshly loaded data with the unconfirmed changes applied on top, in the order they were made. */
export function applyChanges(d: AppData, changes: Change[]): AppData {
  let { categories, logs, settings } = d;
  for (const c of changes) {
    switch (c.m) {
      case 'addLog': logs = [...logs.filter(x => x.id !== c.l.id), c.l]; break;
      case 'deleteLog': logs = logs.filter(x => x.id !== c.l.id); break;
      case 'updateLog': logs = [...logs.filter(x => x.id !== c.next.id), c.next]; break;
      case 'putCategory': categories = [...categories.filter(x => x.id !== c.c.id), c.c]; break;
      case 'putSettings': settings = c.s; break;
    }
  }
  return { categories, logs, settings };
}

/** Whether a change belongs to practice `catId`, so it can be dropped when that practice is deleted. */
export const touchesCategory = (c: Change, catId: string) =>
  (c.m === 'putCategory' && c.c.id === catId) || (c.m === 'addLog' && c.l.catId === catId) || (c.m === 'updateLog' && c.next.catId === catId);
