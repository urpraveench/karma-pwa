import { describe, expect, it } from 'vitest';
import { applyChanges, touchesCategory } from '../src/lib/outbox';
import { withOutbox } from '../src/store/outbox';
import type { AppData, Category, Log } from '../src/lib/types';
import type { Store } from '../src/store/types';

const log = (id: string, catId = 'r', minutes = 10): Log => ({ id, catId, date: '2026-10-07', minutes, note: '', createdAt: 1 });
const cat = (id: string): Category => ({ id, name: id, color: '#000', order: 0, startDate: '2026-10-01', archivedFrom: null, targets: [] });

/** A store whose writes stay pending until settled by hand, like Firestore before the server answers. */
function fakeStore(data: AppData) {
  const calls: string[] = [];
  const waiting: { resolve: () => void; reject: (e: Error) => void }[] = [];
  const write = (name: string) => () => { calls.push(name); return new Promise<void>((resolve, reject) => waiting.push({ resolve, reject })); };
  const store: Store = {
    kind: 'firebase',
    loadAll: async () => structuredClone(data),
    addLog: write('addLog'), deleteLog: write('deleteLog'), updateLog: write('updateLog'), putCategory: write('putCategory'), putSettings: write('putSettings'),
    deleteCategory: async () => { calls.push('deleteCategory'); }, replaceAll: async () => { calls.push('replaceAll'); }, putDevice: async () => {},
  };
  return { store, calls, waiting };
}
const memory = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const tick = () => new Promise(r => setTimeout(r, 0));

describe('applyChanges (SYNC-16)', () => {
  const d: AppData = { categories: [cat('r')], logs: [log('a'), log('b')], settings: { backlogCap: 2 } };
  it('adds, edits and deletes entries, and replaces practices and settings, in order', () => {
    const out = applyChanges(d, [
      { m: 'addLog', l: log('c') }, { m: 'updateLog', prev: log('a'), next: log('a', 'r', 45) }, { m: 'deleteLog', l: log('b') },
      { m: 'putCategory', c: { ...cat('r'), name: 'Books' } }, { m: 'putSettings', s: { backlogCap: 0 } },
    ]);
    expect(out.logs.map(l => `${l.id}${l.minutes}`).sort()).toEqual(['a45', 'c10']);
    expect(out.categories).toEqual([{ ...cat('r'), name: 'Books' }]);
    expect(out.settings).toEqual({ backlogCap: 0 });
  });
  it('never duplicates an entry Firebase already has', () => {
    expect(applyChanges(d, [{ m: 'addLog', l: log('a') }]).logs).toHaveLength(2);
  });
  it('knows which changes belong to a practice', () => {
    expect(touchesCategory({ m: 'addLog', l: log('x', 'r') }, 'r')).toBe(true);
    expect(touchesCategory({ m: 'putCategory', c: cat('w') }, 'r')).toBe(false);
  });
});

describe('withOutbox (SYNC-16)', () => {
  const KEY = 'tiktym:outbox:u1';
  const empty: AppData = { categories: [cat('r')], logs: [], settings: {} };

  it('notes a change before sending it, and clears the note once Firebase confirms it', async () => {
    const { store, waiting } = fakeStore(empty), mem = memory();
    const st = withOutbox(store, KEY, mem);
    const saved = st.addLog(log('a'));
    expect(JSON.parse(mem.m.get(KEY)!)).toHaveLength(1);
    waiting[0].resolve(); await saved;
    expect(mem.m.has(KEY)).toBe(false);
  });

  it('after a reload, shows the unconfirmed change and sends it again', async () => {
    const mem = memory();
    void withOutbox(fakeStore(empty).store, KEY, mem).addLog(log('a')); // the page closes before Firebase answers
    const next = fakeStore(empty);
    const d = await withOutbox(next.store, KEY, mem).loadAll();
    expect(d.logs.map(l => l.id)).toEqual(['a']);
    expect(next.calls).toEqual(['addLog']);
    next.waiting[0].resolve(); await tick();
    expect(mem.m.has(KEY)).toBe(false);
  });

  it("doesn't retry a change Firebase refused, and still reports the refusal", async () => {
    const { store, waiting } = fakeStore(empty), mem = memory();
    const saved = withOutbox(store, KEY, mem).deleteLog(log('a'));
    waiting[0].reject(new Error('permission-denied'));
    await expect(saved).rejects.toThrow('permission-denied');
    expect(mem.m.has(KEY)).toBe(false);
  });

  it('forgets pending changes that a replace-all or a deleted practice makes stale', async () => {
    const { store } = fakeStore(empty), mem = memory();
    const st = withOutbox(store, KEY, mem);
    void st.addLog(log('a', 'r')); void st.addLog(log('b', 'w'));
    await st.deleteCategory('r');
    expect((JSON.parse(mem.m.get(KEY)!) as { c: { l: Log } }[]).map(e => e.c.l.id)).toEqual(['b']);
    await st.replaceAll(empty);
    expect(mem.m.has(KEY)).toBe(false);
  });

  it('keeps working when storage is blocked', async () => {
    const { store, waiting } = fakeStore(empty);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    const saved = withOutbox(store, KEY, blocked).addLog(log('a'));
    waiting[0].resolve();
    await expect(saved).resolves.toBeUndefined();
  });
});
