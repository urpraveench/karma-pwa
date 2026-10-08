import { today } from './date';

// Anonymous daily usage totals (STAT-01, STAT-02). Only running totals are sent, to stats/{date}: no user ID, device
// ID, names, notes or cookies, so nothing can be traced back to a person. Counts collect here and are saved together,
// to keep writes low on the free plan. Without a sink (test mode, signed out) counting does nothing.
// Keep COUNTERS and the limits in step with firestore.rules.

export const COUNTERS = ['activeDevices', 'signUps', 'logs', 'minutes', 'logQuick', 'logTile', 'logAllLeft', 'logCustom',
  'logTimer', 'logOther', 'timersStarted', 'timersReachedTarget', 'practicesAdded', 'cardsShared'] as const;
export type Counter = typeof COUNTERS[number];
export type Counts = Partial<Record<Counter, number>>;
export type StatsSink = (day: string, counts: Counts) => Promise<unknown>;

/** How much one save may add (firestore.rules allows a little more). */
const LIMIT: Partial<Record<Counter, number>> = { minutes: 4000 };
const MAX = 80;
export const FLUSH_AFTER_MS = 15_000;
const ACTIVE_KEY = 'tiktym:active-day';

let sink: StatsSink | null = null;
let pending: Counts = {};
let timer: ReturnType<typeof setTimeout> | null = null;

export function setStatsSink(next: StatsSink | null) {
  if (!next) flushStats(); // save what's collected before the sink goes away
  sink = next;
  if (!next) pending = {};
}

export function flushStats() {
  if (timer) { clearTimeout(timer); timer = null; }
  const counts = pending;
  pending = {};
  if (!sink || !Object.keys(counts).length) return;
  sink(today(), counts).catch(() => { /* offline is handled by Firestore; anything else just loses a count */ });
}

export function count(c: Counter, n = 1) {
  if (!sink || !(n > 0)) return;
  const next = (pending[c] || 0) + Math.round(n);
  if (next > (LIMIT[c] ?? MAX)) flushStats(); // keep each save within the rules' limits
  pending[c] = (pending[c] || 0) + Math.round(n);
  if (!timer) timer = setTimeout(flushStats, FLUSH_AFTER_MS);
}

/** Counts this device once per day. Only today's date is kept, on the device; it's never sent. */
export function countActiveDevice() {
  if (!sink) return;
  const d = today();
  try { if (localStorage.getItem(ACTIVE_KEY) === d) return; localStorage.setItem(ACTIVE_KEY, d); } catch { return; }
  count('activeDevices');
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushStats(); });
  addEventListener('pagehide', flushStats);
}

/** For tests: forget everything collected. */
export function resetStats() { if (timer) clearTimeout(timer); timer = null; pending = {}; sink = null; }
