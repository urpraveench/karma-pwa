import type { Settings } from './types';

// Emails and statistics are on by default, and each can be turned off (NOTIF-01, NOTIF-02; NOTIFICATIONS.md).

export type EmailKind = 'tips' | 'recap' | 'news';

/** The email types someone can turn off, with their Setup labels, in display order. */
export const EMAIL_KINDS: readonly (readonly [EmailKind, string, string])[] = [
  ['tips', 'Welcome and first-week tips', 'A few emails while you get started'],
  ['recap', 'Weekly recap', 'Your last week in one email, every Monday'],
  ['news', 'News about TikTym', 'New features and challenges, at most once a month'],
];

export const emailOn = (s: Settings, kind: EmailKind) => s.emails?.[kind] !== false;

/** Bump when what's on by default changes, so accounts see the notice again. */
export const NOTICE = '2026-10-10';

/** Accounts from before the change see the notice once; new accounts are told at sign-up instead. */
export const needsNotice = (s: Settings) => !!s.seeded && s.notice !== NOTICE;
