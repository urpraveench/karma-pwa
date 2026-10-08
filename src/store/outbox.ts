import { applyChanges, touchesCategory, type Change } from '../lib/outbox';
import type { Store } from './types';

type Entry = { id: string; c: Change };

/**
 * Keeps changes made just before the app closes (SYNC-16). Firestore puts a write in its offline queue a moment after
 * it's made, so a reload in that gap loses it. Each change is first noted in localStorage, which saves at once, and
 * the note is cleared when Firestore confirms the write (or refuses it, as that won't change on a retry). When the
 * app opens, anything still noted is applied to the loaded data and sent again; every write targets a fixed id, so
 * sending one twice changes nothing.
 */
export function withOutbox(inner: Store, key: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): Store {
  let seq = 0;
  const read = (): Entry[] => { try { return JSON.parse(storage.getItem(key) || '[]'); } catch { return []; } };
  const write = (es: Entry[]) => {
    try { if (es.length) storage.setItem(key, JSON.stringify(es)); else storage.removeItem(key); }
    catch { /* storage full or blocked: Firestore's own queue still has the change */ }
  };
  const done = (id: string) => write(read().filter(e => e.id !== id));
  const send = (c: Change): Promise<void> => {
    switch (c.m) {
      case 'addLog': return inner.addLog(c.l);
      case 'deleteLog': return inner.deleteLog(c.l);
      case 'updateLog': return inner.updateLog(c.prev, c.next);
      case 'putCategory': return inner.putCategory(c.c);
      case 'putSettings': return inner.putSettings(c.s);
    }
  };
  const run = (c: Change) => {
    const id = `${Date.now()}-${seq++}`;
    write([...read(), { id, c }]);
    return send(c).finally(() => done(id));
  };

  return {
    ...inner,
    async loadAll() {
      const d = await inner.loadAll();
      const pending = read();
      for (const e of pending) send(e.c).catch(() => { /* refused: don't retry */ }).finally(() => done(e.id));
      return applyChanges(d, pending.map(e => e.c));
    },
    addLog: l => run({ m: 'addLog', l }),
    deleteLog: l => run({ m: 'deleteLog', l }),
    updateLog: (prev, next) => run({ m: 'updateLog', prev, next }),
    putCategory: c => run({ m: 'putCategory', c }),
    putSettings: s => run({ m: 'putSettings', s }),
    deleteCategory(id) { write(read().filter(e => !touchesCategory(e.c, id))); return inner.deleteCategory(id); },
    replaceAll(d) { write([]); return inner.replaceAll(d); },
    ...(inner.deleteAccount && { deleteAccount() { write([]); return inner.deleteAccount!(); } }),
  };
}
