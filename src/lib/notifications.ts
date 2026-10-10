import type { Settings } from './types';

// Emails and statistics are on by default, and each can be turned off (NOTIF-01; NOTIFICATIONS.md).

export type EmailKind = 'tips' | 'recap' | 'news';

/** The email types someone can turn off, with their Setup labels, in display order. */
export const EMAIL_KINDS: readonly (readonly [EmailKind, string, string])[] = [
  ['tips', 'Tips and reminders', 'A welcome, a few tips in your first week, and a nudge if you go quiet'],
  ['recap', 'Weekly recap', 'Your week every Monday, and your monthly progress card'],
  ['news', 'News about TikTym', 'New features and challenges, at most once a month'],
];

export const emailOn = (s: Settings, kind: EmailKind) => s.emails?.[kind] !== false;
