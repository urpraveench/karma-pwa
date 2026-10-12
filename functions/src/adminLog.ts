// The send history (ADMIN-12): adminLog/{id} entries as the History page shows them. Pure, so it's unit-tested
// (tests/adminLog.test.ts).

export type LogKind = 'email' | 'email-test' | 'push' | 'push-test';

export interface HistoryEntry {
  id: string; kind: LogKind; at: string; by: string; audience: string | null; headline: string;
  queued: number; held: number; sent: number; skipped: number; failed: number; skippedWhy: Record<string, number>;
}

const KINDS: LogKind[] = ['email', 'email-test', 'push', 'push-test'];
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** One entry, or null for anything that isn't a send record. `at` is ISO; the headline is the subject (email) or title (push). */
export function historyEntry(id: string, d: Record<string, unknown> | undefined): HistoryEntry | null {
  const kind = KINDS.find(k => k === d?.kind);
  const at = d?.createdAt as { toDate?: () => Date } | undefined;
  if (!d || !kind || typeof at?.toDate !== 'function') return null;
  const why = (d.skippedWhy ?? {}) as Record<string, unknown>;
  return {
    id, kind, at: at.toDate().toISOString(), by: String(d.by ?? ''),
    audience: kind.endsWith('-test') ? null : String(d.audience ?? ''),
    headline: String((kind.startsWith('email') ? d.subject : d.title) ?? ''),
    queued: num(d.queued), held: num(d.held), sent: num(d.sent), skipped: num(d.skipped), failed: num(d.failed),
    skippedWhy: Object.fromEntries(Object.entries(why).map(([k, v]) => [k, num(v)]).filter(([, v]) => (v as number) > 0)),
  };
}
