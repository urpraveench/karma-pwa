// Emails written in the admin console and sent to a group of people (ADMIN-07 to ADMIN-09). Pure, so it's unit-tested
// (tests/broadcast.test.ts); index.ts reads the accounts, queues one task per person and sends.
import { addDays } from './recap.js';
import { emailOn, newsEmail, type Email } from './mail.js';

/** Who a broadcast goes to: everyone (with News on), people active in the last 7 days, or people away 4 days or more. */
export type Audience = 'everyone' | 'active7' | 'away4';
export const AUDIENCES: Audience[] = ['everyone', 'active7', 'away4'];

export interface Draft {
  audience: Audience;
  subject: string;
  title: string;
  body: string;
  button?: { label: string; url: string };
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

/** A draft from the console, or null if anything is missing, too long, or the button link isn't https. */
export function readDraft(v: unknown): Draft | null {
  const d = (v ?? {}) as Record<string, unknown>;
  const audience = AUDIENCES.find(a => a === d.audience);
  const subject = text(d.subject, 120), title = text(d.title, 80), body = text(d.body, 5000);
  if (!audience || !subject || !title || !body) return null;
  const draft: Draft = { audience, subject, title, body };
  if (d.button !== undefined && d.button !== null) {
    const b = d.button as Record<string, unknown>;
    const label = text(b.label, 40), url = text(b.url, 500);
    if (!label || !url || !/^https:\/\/[^\s"<>]+$/.test(url)) return null;
    draft.button = { label, url };
  }
  return draft;
}

/** The lastLogged range an audience is found by, or null for everyone (every account with an email address). */
export function audienceRange(audience: Audience, today: string): { from?: string; to?: string } | null {
  if (audience === 'active7') return { from: addDays(today, -6) };
  if (audience === 'away4') return { to: addDays(today, -4) };
  return null;
}

/** The email itself, in the TikTym template, with a one-tap unsubscribe from News. */
export const broadcastEmail = (d: Draft, name: string, unsubscribe: string): Email =>
  newsEmail({ name, subject: d.subject, title: d.title, body: d.body, button: d.button, unsubscribe });

export interface Recipient { settings: { emails?: Partial<Record<'tips' | 'recap' | 'news', boolean>> } | undefined; lastEmailDay?: string; broadcasts?: string[] }

/** Whether one person gets broadcast `id` today: News on, not emailed already today, and not sent this one before. */
export function broadcastCheck(r: Recipient, id: string, today: string): 'send' | 'off' | 'emailed-today' | 'already-sent' {
  if (r.broadcasts?.includes(id)) return 'already-sent';
  if (!emailOn(r.settings, 'news')) return 'off';
  if (r.lastEmailDay === today) return 'emailed-today';
  return 'send';
}
