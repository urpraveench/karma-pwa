// Who gets the comeback email, and when (NOTIF-07, NOTIF-08). Pure, so it's unit-tested (tests/comeback.test.ts).
// mail/{uid} keeps, on the server only: lastLogged (the newest entry's date, kept up to date by a trigger as entries
// are saved), comebackFor (the lastLogged the comeback was sent for) and lastEmailDay (India date of the last email).
import { addDays } from './recap.js';

/** Full days with nothing logged before the comeback goes, the next morning. */
export const COMEBACK_AFTER_DAYS = 3;
/** Absences older than this are left alone: a comeback a month late feels like spam. */
export const COMEBACK_WINDOW_DAYS = 14;

export interface MailState { lastLogged?: string; comebackFor?: string; lastEmailDay?: string }

/** Today's date in India (UTC+5:30), where the emails are scheduled. */
export const indiaToday = (now: Date) => new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** The newest date with minutes logged in a month's entries, or null. */
export function latestLogDate(entries: Record<string, { date?: unknown; minutes?: unknown }> | undefined): string | null {
  let latest: string | null = null;
  for (const e of Object.values(entries || {}))
    if (typeof e?.date === 'string' && Number(e.minutes) > 0 && (!latest || e.date > latest)) latest = e.date;
  return latest;
}

/** The range of lastLogged dates the daily job asks the database for: away long enough, but not too long. */
export const comebackRange = (today: string) => ({ from: addDays(today, -COMEBACK_WINDOW_DAYS), to: addDays(today, -COMEBACK_AFTER_DAYS - 1) });

/** Whether a comeback is due today: away long enough, not yet sent for this absence, and no other email today. */
export function comebackDue(m: MailState | undefined, today: string): boolean {
  if (!m?.lastLogged) return false;
  const { from, to } = comebackRange(today);
  return m.lastLogged >= from && m.lastLogged <= to && m.comebackFor !== m.lastLogged && m.lastEmailDay !== today;
}

/** Full days since the last entry, for the email ("It's been 4 days"). */
export const daysAway = (lastLogged: string, today: string) => Math.round((Date.parse(today) - Date.parse(lastLogged)) / 86_400_000);
