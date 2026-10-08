import { doc, increment, setDoc, type Firestore } from 'firebase/firestore';
import type { Counts, StatsSink } from '../lib/stats';

/** Saves collected counts as server-side increments to stats/{day}, so concurrent apps never overwrite each other. */
export function firestoreStatsSink(db: Firestore): StatsSink {
  return (day: string, counts: Counts) =>
    setDoc(doc(db, 'stats', day), Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, increment(v!)])), { merge: true });
}
