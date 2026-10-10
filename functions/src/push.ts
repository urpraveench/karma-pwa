// Who gets a push reminder, and when (NOTIF-09, NOTIF-11). Pure, so it's unit-tested (tests/push.test.ts). The server-only
// record reminders/{uid} keeps the account's reminder time, time zone and UTC slot, how many devices allowed
// notifications, and the local date of the last reminder (lastSent). The 15-minute job queries it by slot.
import { localParts, reminderOn, reminderText, reminderTime, utcSlot } from './shared/reminders.js';
import type { Category, Settings } from './shared/types.js';

export interface ReminderDoc { slot: string | null; time: string; tz: string; devices: number; lastSent?: string }

/** reminders/{uid} as the settings and devices say it should be: no slot while off, or with no device to send to. */
export function reminderTarget(settings: Settings | undefined, devices: number, now: Date): Omit<ReminderDoc, 'lastSent'> {
  const time = reminderTime(settings), tz = settings?.reminder?.tz || 'Asia/Kolkata';
  const on = reminderOn(settings) && devices > 0;
  return { slot: on ? utcSlot(time, tz, localParts(now, tz).date) : null, time, tz, devices };
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
