// How the History page describes each send (ADMIN-12). Pure, so it's unit-tested (tests/adminLog.test.ts).
import type { HistoryEntry } from '../../functions/src/adminLog';
import { AUDIENCE_TEXT } from './email';
import { PUSH_AUDIENCE_TEXT } from './push';

export type { HistoryEntry };

const WHY: Record<string, string> = { off: 'News off', 'emailed-today': 'already emailed that day', 'no-email': 'no email address', 'no-device': 'no device' };
const n = (v: number) => v.toLocaleString('en-GB');

export const kindLabel = (e: HistoryEntry) => ({ email: 'Email', 'email-test': 'Email test', push: 'Push', 'push-test': 'Push test' })[e.kind];

export function audienceLabel(e: HistoryEntry): string {
  if (!e.audience) return `Just me (${e.by})`;
  const text = e.kind === 'email' ? AUDIENCE_TEXT[e.audience as keyof typeof AUDIENCE_TEXT] : PUSH_AUDIENCE_TEXT[e.audience as keyof typeof PUSH_AUDIENCE_TEXT];
  return text?.label ?? e.audience;
}

/** "Sending: 12 of 40 done", or "Done" with what happened to everyone. */
export function progress(e: HistoryEntry): { state: 'sending' | 'done'; text: string } {
  const done = e.sent + e.skipped + e.failed;
  const parts = [`${n(e.sent)} sent`];
  if (e.skipped) parts.push(`${n(e.skipped)} skipped (${Object.entries(e.skippedWhy).map(([k, v]) => `${n(v)} ${WHY[k] ?? k}`).join(', ')})`);
  if (e.failed) parts.push(`${n(e.failed)} failed`);
  if (done < e.queued) return { state: 'sending', text: `Sending: ${n(done)} of ${n(e.queued)} done${e.held ? `, ${n(e.held)} waiting for daytime` : ''}. ${parts.join(', ')}` };
  return { state: 'done', text: e.queued ? parts.join(', ') : 'Nobody in the audience' };
}

export const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
