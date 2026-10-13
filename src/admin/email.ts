// The email composer's form (ADMIN-07): what it sends to the admin functions, and what's wrong with it before it does.
// Pure, so it's unit-tested (tests/adminEmail.test.ts). The server checks the same rules again (functions/src/broadcast.ts).
import type { Audience, Draft } from '../../functions/src/broadcast';

export type { Audience, Draft };

export interface EmailForm { audience: Audience; to: string; subject: string; title: string; body: string; buttonLabel: string; buttonUrl: string }

export const EMPTY_FORM: EmailForm = { audience: 'everyone', to: '', subject: '', title: '', body: '', buttonLabel: '', buttonUrl: '' };

export const AUDIENCE_TEXT: Record<Audience, { label: string; hint: string }> = {
  everyone: { label: 'Everyone', hint: 'Every account with News about TikTym on' },
  active7: { label: 'Active in the last 7 days', hint: 'Logged something in the last 7 days' },
  away4: { label: 'Away 4 days or more', hint: 'Logged before, nothing in the last 4 days' },
  person: { label: 'One person', hint: 'One account, by the email it signs in with' },
};

/** An email address as the server accepts it (functions/src/broadcast.ts › readEmail). */
export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

/** What to fix before the form can be previewed or sent, or null. */
export function formProblem(f: EmailForm): string | null {
  if (f.audience === 'person' && !isEmail(f.to)) return 'Enter the email their TikTym account uses.';
  if (!f.subject.trim()) return 'Write a subject.';
  if (f.subject.trim().length > 120) return 'Keep the subject to 120 characters.';
  if (!f.title.trim()) return 'Write a heading.';
  if (f.title.trim().length > 80) return 'Keep the heading to 80 characters.';
  if (!f.body.trim()) return 'Write the text.';
  if (f.body.trim().length > 5000) return 'Keep the text to 5,000 characters.';
  const label = f.buttonLabel.trim(), url = f.buttonUrl.trim();
  if (label || url) {
    if (!label) return 'Give the button a label, or clear its link.';
    if (label.length > 40) return 'Keep the button label to 40 characters.';
    if (!/^https:\/\/[^\s"<>]+$/.test(url)) return 'The button link must start with https://';
  }
  return null;
}

/** The draft the functions take; the button only when it has a label. */
export function draftOf(f: EmailForm): Draft {
  const d: Draft = { audience: f.audience, subject: f.subject.trim(), title: f.title.trim(), body: f.body.trim() };
  if (f.audience === 'person') d.to = f.to.trim().toLowerCase();
  if (f.buttonLabel.trim()) d.button = { label: f.buttonLabel.trim(), url: f.buttonUrl.trim() };
  return d;
}

export const peopleText = (n: number) => `up to ${n.toLocaleString('en-GB')} ${n === 1 ? 'person' : 'people'}`;
