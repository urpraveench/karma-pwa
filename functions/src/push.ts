// Who gets a push reminder, and when (NOTIF-09, NOTIF-11). Pure, so it's unit-tested (tests/push.test.ts). The server-only
// record reminders/{uid} keeps the account's reminder time, time zone and UTC slot, how many devices allowed
// notifications, and the local date of the last reminder (lastSent). The 15-minute job queries it by slot.
import { LOG_NUDGE_TEXT, LOG_NUDGE_TIME, localParts, logNudgeOn, reminderOn, reminderText, reminderTime, utcSlot } from './shared/reminders.js';
import type { Category, Settings } from './shared/types.js';

export interface ReminderDoc {
  slot: string | null; time: string; tz: string; devices: number; lastSent?: string;
  /** When the daily reminder last reached a device (ms), so the 8 pm check never follows it within the hour. */
  lastSentAt?: number;
  /** The UTC slot of 8 pm local for the evening log check (NOTIF-18), and the local date it last went. */
  nudgeSlot?: string | null; nudgeSent?: string;
}

/** reminders/{uid} as the settings and devices say it should be: no slot while off, or with no device to send to. */
export function reminderTarget(settings: Settings | undefined, devices: number, now: Date): Omit<ReminderDoc, 'lastSent' | 'lastSentAt' | 'nudgeSent'> {
  const time = reminderTime(settings), tz = settings?.reminder?.tz || 'Asia/Kolkata', date = localParts(now, tz).date;
  const on = reminderOn(settings) && devices > 0;
  return { slot: on ? utcSlot(time, tz, date) : null, time, tz, devices, nudgeSlot: nudgeSlotFor(settings, devices, tz, date) };
}

/** 8 pm local as a UTC slot, or null when the evening log check is off or there's no device (NOTIF-18). */
export const nudgeSlotFor = (settings: Settings | undefined, devices: number, tz: string, date: string) =>
  logNudgeOn(settings) && devices > 0 ? utcSlot(LOG_NUDGE_TIME, tz, date) : null;

/** The hour the 8 pm check keeps clear after the daily reminder. */
export const NUDGE_GAP_MS = 3600_000;

/**
 * The evening log check, when the job finds this account at 8 pm (NOTIF-18): send only if nothing is logged today and
 * something was due, never twice a day, never within the hour after the daily reminder, never after 10 pm; or wait
 * while daylight saving has moved the slot early (the record gets the new slot).
 */
export function nudgeCheck(doc: ReminderDoc, now: Date, day: { logged: boolean; due: boolean }):
  { act: 'send' | 'sent-today' | 'later' | 'too-late' | 'logged' | 'nothing-due' | 'just-reminded'; date: string; slot: string } {
  const { date, time } = localParts(now, doc.tz), slot = utcSlot(LOG_NUDGE_TIME, doc.tz, date);
  const r = (act: ReturnType<typeof nudgeCheck>['act']) => ({ act, date, slot });
  if (doc.nudgeSent === date) return r('sent-today');
  if (time < LOG_NUDGE_TIME) return r('later');
  if (time >= '22:00') return r('too-late');
  if (day.logged) return r('logged');
  if (!day.due) return r('nothing-due');
  if (doc.lastSent === date && doc.lastSentAt && now.getTime() - doc.lastSentAt < NUDGE_GAP_MS) return r('just-reminded');
  return r('send');
}

/** The evening log check's notification, with the badge count unless the badge is off. */
export function nudgePayload(left: number, badge: boolean): string {
  return JSON.stringify({ ...LOG_NUDGE_TEXT, badge: badge ? left : null, url: '/', tag: 'log-nudge' });
}

/**
 * What to do when the job finds this account in the current slot: send; skip because one went today; or wait, because
 * daylight saving moved the slot and the chosen time hasn't come yet locally (the record gets the new slot).
 */
export function reminderCheck(doc: ReminderDoc, now: Date): { act: 'send' | 'sent-today' | 'later' | 'too-late'; date: string; slot: string } {
  const { date, time } = localParts(now, doc.tz), slot = utcSlot(doc.time, doc.tz, date);
  if (doc.lastSent === date) return { act: 'sent-today', date, slot };
  if (time < doc.time) return { act: 'later', date, slot };
  if (time >= '22:00') return { act: 'too-late', date, slot };
  return { act: 'send', date, slot };
}

/** A push service answering 404 or 410 means that device is gone for good (NOTIF-11). */
export const deviceGone = (statusCode: unknown) => statusCode === 404 || statusCode === 410;

/** What the service worker receives: the notification, and the badge count unless the badge is switched off. */
export function reminderPayload(left: Pick<Category, 'name'>[], badge: boolean): string {
  return JSON.stringify({ ...reminderText(left), badge: badge ? left.length : null, url: '/', tag: 'daily-reminder' });
}

/**
 * Sends to each device in turn. A device that's gone is removed; any other failure is kept, so the caller can let the
 * queue retry when nothing got through (NOTIF-11).
 */
export async function sendToDevices<D>(devices: D[], send: (d: D) => Promise<unknown>, remove: (d: D) => Promise<unknown>): Promise<{ sent: number; removed: number; failed: unknown }> {
  let sent = 0, removed = 0, failed: unknown = null;
  for (const d of devices) {
    try { await send(d); sent++; }
    catch (e) {
      if (deviceGone((e as { statusCode?: unknown })?.statusCode)) { await remove(d); removed++; }
      else failed = e;
    }
  }
  return { sent, removed, failed };
}
