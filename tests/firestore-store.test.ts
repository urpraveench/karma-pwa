import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Category, Log } from '../src/lib/types';

// An in-memory stand-in for the parts of the Firestore API the store uses, with a read counter.
const fake = vi.hoisted(() => {
  const DEL = Symbol('del');
  const db = new Map<string, any>(); // path -> data
  const state = { reads: 0, authDeleted: false };
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const deepMerge = (a: any, b: any): any => {
    const o = { ...(a || {}) };
    for (const [k, v] of Object.entries(b)) { if (v === DEL) delete o[k]; else o[k] = isObj(v) && isObj(o[k]) ? deepMerge(o[k], v) : v; }
    return o;
  };
  const f = {
    collection: (_db: unknown, ...p: string[]) => ({ path: p.join('/') }),
    doc: (a: any, ...p: string[]) => ({ path: (a.path ? [a.path, ...p] : p).join('/') }),
    deleteField: () => DEL,
    async getDocs(c: { path: string }) {
      const docs = [...db.keys()].filter(k => k.startsWith(c.path + '/') && !k.slice(c.path.length + 1).includes('/'))
        .map(k => ({ ref: { path: k }, data: () => structuredClone(db.get(k)) }));
      state.reads += Math.max(1, docs.length);
      return { docs, empty: !docs.length };
    },
    async getDoc(r: { path: string }) { state.reads++; return { exists: () => db.has(r.path), data: () => structuredClone(db.get(r.path)) }; },
    async setDoc(r: { path: string }, d: any, o?: { merge?: boolean }) { db.set(r.path, o?.merge ? deepMerge(db.get(r.path), d) : deepMerge({}, d)); },
    async updateDoc(r: { path: string }, d: Record<string, unknown>) {
      if (!db.has(r.path)) throw new Error('no doc');
      const cur = structuredClone(db.get(r.path));
      for (const [k, v] of Object.entries(d)) {
        const ps = k.split('.'); let o = cur;
        for (const p of ps.slice(0, -1)) o = (o[p] ||= {});
        if (v === DEL) delete o[ps.at(-1)!]; else o[ps.at(-1)!] = v;
      }
      db.set(r.path, cur);
    },
    async deleteDoc(r: { path: string }) { db.delete(r.path); },
    writeBatch() {
      const ops: (() => Promise<void>)[] = [];
      return {
        set: (r: any, d: any, o?: any) => ops.push(() => f.setDoc(r, d, o)),
        update: (r: any, d: any) => ops.push(() => f.updateDoc(r, d)),
        delete: (r: any) => ops.push(() => f.deleteDoc(r)),
        commit: async () => { for (const o of ops) await o(); },
      };
    },
  };
  return { db, state, f };
});

vi.mock('firebase/firestore', () => fake.f);
vi.mock('firebase/auth', () => ({ deleteUser: async () => { fake.state.authDeleted = true; } }));

const { FirebaseStore } = await import('../src/store/firebase');

describe('FirebaseStore', () => {
  const uid = 'u1';
  const { db, state } = fake;
  const st = FirebaseStore({} as Firestore, { currentUser: {} } as Auth, uid);

  beforeAll(() => {
    // legacy schema-1 data: 300 individual log docs across 3 months
    for (let i = 0; i < 300; i++) {
      const m = ['2026-08', '2026-09', '2026-10'][i % 3];
      const l = { id: 'l' + i, catId: i % 2 ? 'a' : 'b', date: `${m}-0${1 + i % 9}`, minutes: 10 };
      db.set(`users/${uid}/logs/${l.id}`, l);
    }
    db.set(`users/${uid}/categories/a`, { id: 'a' });
    db.set(`users/${uid}/categories/b`, { id: 'b' });
  });

  it('migrates schema 1 to monthly buckets, keeping all logs', async () => {
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(300);
    expect([...db.keys()].some(k => k.includes('/logs/'))).toBe(false);
    expect(d.settings.schema).toBe(2);
  });

  it('reloads with a handful of reads', async () => {
    state.reads = 0;
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(300);
    expect(state.reads).toBeLessThanOrEqual(6); // was ~302 in schema 1
  });

  it('addLog merges into the month doc', async () => {
    await st.addLog({ id: 'new1', catId: 'a', date: '2026-10-07', minutes: 25, note: '', createdAt: 0 });
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(301);
    expect(d.logs.some(l => l.id === 'new1')).toBe(true);
  });

  it('deleteLog removes only that entry', async () => {
    await st.deleteLog({ id: 'new1', date: '2026-10-07' });
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(300);
    expect(d.logs.some(l => l.id === 'new1')).toBe(false);
  });

  it('deleteCategory removes its logs and the category', async () => {
    await st.deleteCategory('a');
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(150);
    expect(d.logs.every(l => l.catId === 'b')).toBe(true);
    expect(d.categories).toHaveLength(1);
  });

  it('replaceAll wipes and rewrites', async () => {
    await st.replaceAll({
      categories: [{ id: 'z' } as Category],
      logs: [{ id: 'q', catId: 'z', date: '2026-07-01', minutes: 5 } as Log],
      settings: { seeded: true },
    });
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(1);
    expect(d.categories).toHaveLength(1);
    expect(d.settings.schema).toBe(2);
  });

  it('deleteAccount removes all data, then the auth user', async () => {
    await st.deleteAccount!();
    expect([...db.keys()].filter(k => k.startsWith('users/u1'))).toHaveLength(0);
    expect(state.authDeleted).toBe(true);
  });
});
