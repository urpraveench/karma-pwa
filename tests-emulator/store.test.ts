import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDocs, collection, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import { FirebaseStore } from '../src/store/firebase';
import type { Category, Log } from '../src/lib/types';

// The real Firestore store against the real Firestore emulator, signed in as a real (emulated) user,
// with firestore.rules enforced. Complements tests/firestore-store.test.ts, which uses an in-memory fake.

let app: FirebaseApp, auth: Auth, db: Firestore, uid: string;
const cat = (id: string): Category => ({ id, name: id, color: '#000', order: 0, startDate: '2026-10-01', archivedFrom: null, targets: [{ from: '2026-10-01', minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] }] });
const log = (id: string, catId: string, date: string): Log => ({ id, catId, date, minutes: 10, note: '', createdAt: 1 });

beforeAll(async () => {
  app = initializeApp({ projectId: 'demo-tiktym', apiKey: 'fake-api-key' }, 'store-test-' + Date.now());
  auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const cred = await createUserWithEmailAndPassword(auth, `store-${Date.now()}@test.local`, 'secret123');
  uid = cred.user.uid;
});
afterAll(() => deleteApp(app));

describe('FirebaseStore on the emulator', () => {
  it('migrates schema 1 logs into monthly buckets (SYNC-05)', async () => {
    for (let i = 0; i < 30; i++) await setDoc(doc(db, 'users', uid, 'logs', 'old' + i), log('old' + i, 'a', `2026-0${7 + i % 3}-1${i % 9}`));
    const st = FirebaseStore(db, auth, uid);
    const d = await st.loadAll();
    expect(d.logs).toHaveLength(30);
    expect(d.settings.schema).toBe(2);
    expect((await getDocs(collection(db, 'users', uid, 'logs'))).empty).toBe(true);
    expect((await getDocs(collection(db, 'users', uid, 'months'))).size).toBe(3);
  });

  it('round-trips practices, logs and settings (SYNC-03, SYNC-06)', async () => {
    const st = FirebaseStore(db, auth, uid);
    await st.replaceAll({ categories: [cat('a'), cat('b')], logs: [log('l1', 'a', '2026-10-01'), log('l2', 'b', '2026-10-02'), log('l3', 'a', '2026-09-30')], settings: { seeded: true, backlogCap: 3 } });
    await st.addLog(log('l4', 'b', '2026-10-03'));
    await st.deleteLog({ id: 'l1', date: '2026-10-01' });
    const d = await FirebaseStore(db, auth, uid).loadAll();
    expect(d.categories.map(c => c.id).sort()).toEqual(['a', 'b']);
    expect(d.logs.map(l => l.id).sort()).toEqual(['l2', 'l3', 'l4']);
    expect(d.settings).toMatchObject({ seeded: true, backlogCap: 3, schema: 2 });
  });

  it('edits a log in place and moves it between months (SYNC-15)', async () => {
    const st = FirebaseStore(db, auth, uid);
    const l = log('e1', 'a', '2026-10-05');
    await st.addLog(l);
    await st.updateLog(l, { ...l, minutes: 45, note: 'Edited' });
    let d = await FirebaseStore(db, auth, uid).loadAll();
    expect(d.logs.find(x => x.id === 'e1')).toMatchObject({ minutes: 45, note: 'Edited', date: '2026-10-05' });
    await st.updateLog(l, { ...l, minutes: 45, note: 'Edited', date: '2026-08-31' });
    d = await FirebaseStore(db, auth, uid).loadAll();
    expect(d.logs.filter(x => x.id === 'e1')).toEqual([{ ...l, minutes: 45, note: 'Edited', date: '2026-08-31' }]);
    await st.deleteLog({ id: 'e1', date: '2026-08-31' });
  });

  it('deleting a practice removes its logs in every month (SYNC-07)', async () => {
    const st = FirebaseStore(db, auth, uid);
    await st.deleteCategory('b');
    const d = await st.loadAll();
    expect(d.categories.map(c => c.id)).toEqual(['a']);
    expect(d.logs.map(l => l.id)).toEqual(['l3']);
  });

  it('replaceAll handles more than one batch (SYNC-08)', async () => {
    const st = FirebaseStore(db, auth, uid);
    const logs = Array.from({ length: 900 }, (_, i) => log('m' + i, 'a', `2026-${String(1 + i % 12).padStart(2, '0')}-15`));
    const cats = Array.from({ length: 450 }, (_, i) => cat('c' + i));
    await st.replaceAll({ categories: cats, logs, settings: { seeded: true } });
    const d = await st.loadAll();
    expect(d.categories).toHaveLength(450);
    expect(d.logs).toHaveLength(900);
  });

  it('deleteAccount removes every document, then the user (SYNC-09)', async () => {
    const st = FirebaseStore(db, auth, uid);
    await st.deleteAccount!();
    expect(auth.currentUser).toBeNull();
  });
});
