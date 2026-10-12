import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { deleteDoc, doc, getDoc, getDocs, collection, increment, setDoc } from 'firebase/firestore';

// SYNC-10: each user can read and write only users/{their uid}.
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tiktym',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const PATHS = ['users/alice/categories/c1', 'users/alice/months/2026-10', 'users/alice/meta/settings'];

describe('firestore.rules', () => {
  for (const path of PATHS) {
    it(`owner can write, read and delete ${path}`, async () => {
      const db = env.authenticatedContext('alice').firestore();
      await assertSucceeds(setDoc(doc(db, path), { x: 1 }));
      await assertSucceeds(getDoc(doc(db, path)));
      await assertSucceeds(deleteDoc(doc(db, path)));
    });

    it(`another user cannot read or write ${path}`, async () => {
      await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), path), { x: 1 }));
      const db = env.authenticatedContext('mallory').firestore();
      await assertFails(getDoc(doc(db, path)));
      await assertFails(setDoc(doc(db, path), { x: 2 }));
      await assertFails(deleteDoc(doc(db, path)));
    });

    it(`signed-out visitors cannot read or write ${path}`, async () => {
      await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), path), { x: 1 }));
      const db = env.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, path)));
      await assertFails(setDoc(doc(db, path), { x: 2 }));
    });
  }

  it('nobody can list other users', async () => {
    await assertFails(getDocs(collection(env.authenticatedContext('alice').firestore(), 'users')));
  });

  it('nothing outside users/ is readable or writable', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'public/x'), { x: 1 }));
    await assertFails(getDoc(doc(db, 'public/x')));
  });

  it("the server's email records (mail/) are out of apps' reach, even for their own account (NOTIF-03)", async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'mail/alice')));
    await assertFails(setDoc(doc(db, 'mail/alice'), { nudgeDueAt: 0 }));
  });

  it("an app saves its own notification devices, but never another's, and the server's reminder records are out of reach (NOTIF-12)", async () => {
    const db = env.authenticatedContext('alice').firestore();
    const device = { endpoint: 'https://push.example/a', keys: { p256dh: 'p', auth: 'a' }, createdAt: 1 };
    await assertSucceeds(setDoc(doc(db, 'users/alice/devices/d1'), device));
    await assertFails(setDoc(doc(db, 'users/bob/devices/d1'), device));
    await assertFails(getDoc(doc(db, 'reminders/alice')));
    await assertFails(setDoc(doc(db, 'reminders/alice'), { slot: '13:30' }));
  });

  it("the admin console's data is out of every app's reach, even an admin's: the console reads it through functions (ADMIN-03)", async () => {
    await env.withSecurityRulesDisabled(async c => {
      await setDoc(doc(c.firestore(), 'adminStats/2026-10-12'), { accounts: 1 });
      await setDoc(doc(c.firestore(), 'adminLog/b1'), { kind: 'email' });
    });
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('alice').firestore(), env.authenticatedContext('praveen', { admin: true }).firestore()]) {
      for (const path of ['adminStats/2026-10-12', 'adminLog/b1']) {
        await assertFails(getDoc(doc(db, path)));
        await assertFails(setDoc(doc(db, path), { x: 1 }));
        await assertFails(deleteDoc(doc(db, path)));
      }
      await assertFails(getDocs(collection(db, 'adminLog')));
    }
  });
});

// STAT-03: anonymous daily totals: only small increments to known counters, never readable from an app.
describe('stats/{day} rules', () => {
  const day = 'stats/2026-10-08';
  const signedIn = () => env.authenticatedContext('anyone').firestore();

  it('a signed-in app can add to known counters', async () => {
    await assertSucceeds(setDoc(doc(signedIn(), day), { logs: increment(1), minutes: increment(30), logQuick: increment(1) }, { merge: true }));
    await assertSucceeds(setDoc(doc(signedIn(), day), { logs: increment(2), activeDevices: increment(1) }, { merge: true }));
  });

  it('nobody can read the totals from an app, even signed in', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), day), { logs: 5 }));
    await assertFails(getDoc(doc(signedIn(), day)));
    await assertFails(getDocs(collection(signedIn(), 'stats')));
  });

  it('signed-out visitors cannot write', async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), day), { logs: increment(1) }, { merge: true }));
  });

  it('rejects unknown fields, decreases, big jumps, non-numbers and badly named days', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), day), { logs: 10, minutes: 100 }));
    const db = signedIn();
    await assertFails(setDoc(doc(db, day), { userId: 'abc' }, { merge: true }));
    await assertFails(setDoc(doc(db, day), { logs: increment(-1) }, { merge: true }));
    await assertFails(setDoc(doc(db, day), { logs: increment(500) }, { merge: true }));
    await assertFails(setDoc(doc(db, day), { minutes: increment(6000) }, { merge: true }));
    await assertFails(setDoc(doc(db, day), { logs: 'many' }, { merge: true }));
    await assertFails(setDoc(doc(db, 'stats/hello'), { logs: increment(1) }, { merge: true }));
    await assertFails(deleteDoc(doc(db, day)));
  });
});
