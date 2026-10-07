import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';

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
});
