import { deleteUser, type Auth } from 'firebase/auth';
import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch,
  type DocumentData, type Firestore, type QueryDocumentSnapshot, type WriteBatch,
} from 'firebase/firestore';
import type { AppData, Category, Log, Settings } from '../lib/types';
import type { Store } from './types';

// Firestore layout (schema 2): logs are bucketed into one doc per month, keyed by log id.
// A year of history costs ~12 reads per app open instead of one read per log entry.
//   users/{uid}/categories/{id}   users/{uid}/months/{YYYY-MM} { entries: { [logId]: log } }   users/{uid}/meta/settings
//   users/{uid}/devices/{id}: devices that allowed push reminders

type Op = (b: WriteBatch) => void;
const BATCH_LIMIT = 400; // Firestore allows 500 writes per batch; leave headroom

export function FirebaseStore(db: Firestore, auth: Auth, uid: string): Store {
  const cats = () => collection(db, 'users', uid, 'categories');
  const months = () => collection(db, 'users', uid, 'months');
  const monthRef = (m: string) => doc(db, 'users', uid, 'months', m);
  const legacyLogs = () => collection(db, 'users', uid, 'logs');
  const settingsDoc = () => doc(db, 'users', uid, 'meta', 'settings');
  const devices = () => collection(db, 'users', uid, 'devices');
  const mk = (d: string) => d.slice(0, 7);
  const group = (logs: Log[]) => { const g: Record<string, Record<string, Log>> = {}; for (const l of logs) (g[mk(l.date)] ||= {})[l.id] = l; return g; };
  const entriesOf = (d: QueryDocumentSnapshot<DocumentData>) => Object.values((d.data().entries || {}) as Record<string, Log>);
  const commitChunks = async (ops: Op[]) => {
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) { const b = writeBatch(db); ops.slice(i, i + BATCH_LIMIT).forEach(op => op(b)); await b.commit(); }
  };
  async function migrateLegacy() { // schema 1 stored one doc per log
    const old = await getDocs(legacyLogs()); if (old.empty) return;
    const g = group(old.docs.map(d => d.data() as Log));
    await commitChunks([
      ...Object.entries(g).map(([m, entries]): Op => b => b.set(monthRef(m), { entries }, { merge: true })),
      ...old.docs.map((d): Op => b => b.delete(d.ref)),
    ]);
  }
  async function wipe() {
    const [c, m, l] = await Promise.all([getDocs(cats()), getDocs(months()), getDocs(legacyLogs())]);
    await commitChunks([...c.docs, ...m.docs, ...l.docs].map((x): Op => b => b.delete(x.ref)));
  }
  return {
    kind: 'firebase',
    async loadAll() {
      let [c, mo, s] = await Promise.all([getDocs(cats()), getDocs(months()), getDoc(settingsDoc())]);
      let settings: Settings = s.exists() ? s.data() : {};
      if (settings.schema !== 2) {
        await migrateLegacy();
        settings = { ...settings, schema: 2 };
        await setDoc(settingsDoc(), settings, { merge: true });
        mo = await getDocs(months());
      }
      return { categories: c.docs.map(d => d.data() as Category), logs: mo.docs.flatMap(entriesOf), settings };
    },
    putCategory: c => setDoc(doc(cats(), c.id), c),
    async deleteCategory(id) {
      const mo = await getDocs(months()), ops: Op[] = [];
      mo.docs.forEach(d => {
        const upd: Record<string, unknown> = {};
        entriesOf(d).forEach(l => { if (l.catId === id) upd[`entries.${l.id}`] = deleteField(); });
        if (Object.keys(upd).length) ops.push(b => b.update(d.ref, upd));
      });
      ops.push(b => b.delete(doc(cats(), id)));
      await commitChunks(ops);
    },
    addLog: l => setDoc(monthRef(mk(l.date)), { entries: { [l.id]: l } }, { merge: true }),
    deleteLog: l => updateDoc(monthRef(mk(l.date)), { [`entries.${l.id}`]: deleteField() }),
    async updateLog(prev, next) {
      if (mk(prev.date) === mk(next.date)) return updateDoc(monthRef(mk(next.date)), { [`entries.${next.id}`]: next });
      const b = writeBatch(db); // moved to another month: out of the old doc and into the new one together
      b.update(monthRef(mk(prev.date)), { [`entries.${prev.id}`]: deleteField() });
      b.set(monthRef(mk(next.date)), { entries: { [next.id]: next } }, { merge: true });
      await b.commit();
    },
    putSettings: s => setDoc(settingsDoc(), { ...s, schema: 2 }, { merge: true }),
    async replaceAll(d: AppData) {
      await wipe();
      await commitChunks([
        ...d.categories.map((x): Op => b => b.set(doc(cats(), x.id), x)),
        ...Object.entries(group(d.logs)).map(([m, entries]): Op => b => b.set(monthRef(m), { entries })),
        b => b.set(settingsDoc(), { ...(d.settings || {}), schema: 2 }),
      ]);
    },
    putDevice: (id, d) => setDoc(doc(devices(), id), d),
    async deleteAccount() { // data first, then the auth user (may require a recent sign-in)
      await wipe();
      await commitChunks((await getDocs(devices())).docs.map((x): Op => b => b.delete(x.ref))); // no reminders after the account is gone (NOTIF-14)
      await deleteDoc(settingsDoc());
      if (auth.currentUser) await deleteUser(auth.currentUser);
    },
  };
}
