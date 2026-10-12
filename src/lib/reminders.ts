import type { Category, Settings } from './types';

// Daily push reminders and the app badge (NOTIF-09 to NOTIF-13; NOTIFICATIONS.md). Shared with the Cloud Functions
// (scripts/shared-code.ts), so the app and the server agree on the time, the wording and what counts.

/** TikTym's web-push public key (the private half is the VAPID_PRIVATE_KEY secret on the server). Public by design. */
export const VAPID_PUBLIC_KEY = 'BF97llN5U2qP4jQIYlqQxzOfeOCCNwq1ZySEDYZZlPJOh55S05VZa5xcuMDutzMaKEY_0JbYiXxpfA6Qgo4aS5A';

/** The time used until someone picks one. */
export const DEFAULT_REMINDER = '19:00';

/** Times a reminder can be set for: every 15 minutes from 7 am to 9:45 pm, never at night. */
export const REMINDER_TIMES: string[] = Array.from({ length: (22 - 7) * 4 }, (_, i) => `${String(7 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

/** On unless switched off: it only does anything once a device has allowed notifications. */
export const reminderOn = (s: Settings | undefined) => s?.reminder?.on !== false;
export const reminderTime = (s: Settings | undefined) => (s?.reminder?.time && REMINDER_TIMES.includes(s.reminder.time) ? s.reminder.time : DEFAULT_REMINDER);
export const badgeOn = (s: Settings | undefined) => s?.badge !== false;

/** The evening log check (NOTIF-18): 8 pm local, on unless switched off, independent of the daily reminder. */
export const LOG_NUDGE_TIME = '20:00';
export const logNudgeOn = (s: Settings | undefined) => s?.logNudge !== false;
/** What it says: a question, and the quickest way to answer it. */
export const LOG_NUDGE_TEXT = { title: 'Did you log what you did today?', body: 'Tap the mic and just say it.' };

/** The number on the app icon: practices left today, or 0 (no badge) when the day is clear or the badge is off (NOTIF-13). */
export const badgeCount = (s: Settings | undefined, left: unknown[]) => (badgeOn(s) ? left.length : 0);

/** The reminder time nearest to `d`, kept inside 7 am to 9:45 pm ("Remind me tomorrow at this time"). */
export function nearestTime(d: Date): string {
  const q = Math.round((d.getHours() * 60 + d.getMinutes()) / 15) * 15;
  const clamped = Math.min(Math.max(q, 7 * 60), 21 * 60 + 45);
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/** "7:30 pm", for buttons and Setup. */
export function timeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

/** The date ('YYYY-MM-DD') and time ('HH:MM') at `instant` in time zone `tz`. */
export function localParts(instant: Date, tz: string): { date: string; time: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(instant).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Minutes `tz` is ahead of UTC at `instant` (330 for India). */
function offsetAt(instant: number, tz: string): number {
  const { date, time } = localParts(new Date(instant), tz);
  return Math.round((Date.parse(`${date}T${time}:00Z`) - Math.floor(instant / 60_000) * 60_000) / 60_000);
}

/**
 * The UTC time ('HH:MM') of `time` in time zone `tz` on `date`: the 15-minute slot the server's job sends it in.
 * Daylight saving is taken from that date, so the server recomputes it each day it sends.
 */
export function utcSlot(time: string, tz: string, date: string): string {
  const wall = Date.parse(`${date}T${time}:00Z`);
  let utc = wall - offsetAt(wall, tz) * 60_000;
  utc = wall - offsetAt(utc, tz) * 60_000; // again, from the right side of a daylight-saving change
  return new Date(utc).toISOString().slice(11, 16);
}

/** The 15-minute slot an instant falls in, in UTC: what the server's job looks for. */
export const slotAt = (instant: Date) => {
  const m = Math.floor((instant.getUTCHours() * 60 + instant.getUTCMinutes()) / 15) * 15;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const list = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** A practice's own reminder time (PRAC-24, NOTIF-19), or null when it has none or it isn't an allowed time. */
export const practiceRemindTime = (c: Pick<Category, 'remind'>) => (c.remind && REMINDER_TIMES.includes(c.remind) ? c.remind : null);

/** What a practice reminder says (NOTIF-19): practices set for the same time share one. */
export function practiceReminderText(due: Pick<Category, 'name'>[]): { title: string; body: string } {
  return { title: `Time for ${list(due.map(c => c.name))}`, body: 'Even 5 minutes counts.' };
}

/** What the reminder says, from the practices still due today. Gentle: no minutes owed, no streak warnings. */
export function reminderText(left: Pick<Category, 'name'>[]): { title: string; body: string } {
  const names = left.map(c => c.name);
  if (names.length === 1) return { title: `${names[0]} is left today`, body: 'Even 5 minutes counts.' };
  return { title: `${names.length} practices left today`, body: `${list(names)}. Even 5 minutes counts.` };
}
