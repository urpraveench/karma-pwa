// Who gets a push reminder, and when (NOTIF-09, NOTIF-11). Pure, so it's unit-tested (tests/push.test.ts). The server-only
// record reminders/{uid} keeps the account's reminder time, time zone and UTC slot, how many devices allowed
// notifications, and the local date of the last reminder (lastSent). The 15-minute job queries it by slot.
import { LOG_NUDGE_TEXT, LOG_NUDGE_TIME, localParts, logNudgeOn, practiceReminderText, practiceRemindTime, reminderOn, reminderText, reminderTime, utcSlot } from './shared/reminders.js';
import type { Category, Settings } from './shared/types.js';

export interface ReminderDoc {
  slot: string | null; time: string; tz: string; devices: number; lastSent?: string;
  /** The UTC slot of 8 pm local for the evening log check (NOTIF-18), and the local date it last went. */
  nudgeSlot?: string | null; nudgeSent?: string;
  /** The UTC slots of the practices' own reminders (NOTIF-19, NOTIF-20), and the local date each practice's last went. */
  practiceSlots?: string[]; practiceSent?: Record<string, string>;
}

/** reminders/{uid} as the settings and devices say it should be: no slot while off, or with no device to send to. */
export function reminderTarget(settings: Settings | undefined, devices: number, now: Date, categories: PracticeReminder[] = []): Omit<ReminderDoc, 'lastSent' | 'nudgeSent' | 'practiceSent'> {
  const time = reminderTime(settings), tz = settings?.reminder?.tz || 'Asia/Kolkata', date = localParts(now, tz).date;
  const on = reminderOn(settings) && devices > 0;
  return {
    slot: on ? utcSlot(time, tz, date) : null, time, tz, devices, nudgeSlot: nudgeSlotFor(settings, devices, tz, date),
    practiceSlots: practiceSlotsFor(categories, devices, tz, date),
  };
}

type PracticeReminder = Pick<Category, 'id' | 'name' | 'remind' | 'archivedFrom'>;

/** The UTC slots of the active practices' own reminder times on `date`, each once; none without a device (NOTIF-20). */
export function practiceSlotsFor(categories: PracticeReminder[], devices: number, tz: string, date: string): string[] {
  if (!devices) return [];
  const times = categories.filter(c => !c.archivedFrom).map(practiceRemindTime).filter((t): t is string => !!t);
  return [...new Set(times.map(t => utcSlot(t, tz, date)))].sort();
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * The practice reminders due when the job finds this account in a slot (NOTIF-19): practices whose own time has come in
 * the last hour and that haven't had one today. `send` are those still due today (ids in `left`); `handled` is every one
 * that came up, sent or not, so it isn't looked at again today. Nothing after 10 pm. `slots` is today's set, which
 * daylight saving may have moved.
 */
export function practiceCheck(categories: PracticeReminder[], doc: ReminderDoc, now: Date, left: Set<string>):
  { date: string; send: PracticeReminder[]; handled: string[]; slots: string[] } {
  const { date, time } = localParts(now, doc.tz), at = minutes(time);
  const slots = practiceSlotsFor(categories, doc.devices, doc.tz, date);
  if (time >= '22:00') return { date, send: [], handled: [], slots };
  const come = categories.filter(c => {
    const t = practiceRemindTime(c);
    return t && !c.archivedFrom && doc.practiceSent?.[c.id] !== date && minutes(t) <= at && at < minutes(t) + 60;
  });
  return { date, send: come.filter(c => left.has(c.id)), handled: come.map(c => c.id), slots };
}

/** A practice reminder's notification; the tag is per time, so it doesn't replace the daily reminder. */
export function practicePayload(due: Pick<Category, 'name' | 'remind'>[], left: number, badge: boolean): string {
  return JSON.stringify({ ...practiceReminderText(due), badge: badge ? left : null, url: '/', tag: practiceTag(due[0]?.remind) });
}

/** The notification tag and web-push topic (letters, digits and '-' only) for a practice reminder time. */
export const practiceTag = (time: string | null | undefined) => `practice-${(time ?? '').replace(':', '')}`;

/** 8 pm local as a UTC slot, or null when the evening log check is off or there's no device (NOTIF-18). */
export const nudgeSlotFor = (settings: Settings | undefined, devices: number, tz: string, date: string) =>
  logNudgeOn(settings) && devices > 0 ? utcSlot(LOG_NUDGE_TIME, tz, date) : null;

/** A daily reminder set after this time and up to 8 pm already came within the hour, so the 8 pm check skips that day. */
export const NUDGE_QUIET_AFTER = '19:00';

/**
 * The evening log check, when the job finds this account at 8 pm (NOTIF-18): send only if nothing is logged today and
 * something was due, never twice a day, not on a day the daily reminder (set after 7 pm, up to 8 pm) already came, never
 * after 10 pm; or wait
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
  if (doc.lastSent === date && doc.time > NUDGE_QUIET_AFTER && doc.time <= LOG_NUDGE_TIME) return r('just-reminded');
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
 * The Topic header for a push, in a form every push service accepts (NOTIF-21): only URL-safe Base64 letters, at most
 * 32, padded with zeros to a length divisible by 4. Apple's service decodes the topic as Base64 and refuses lengths it
 * can't decode (`BadWebPushTopic`), such as 9 ("log-nudge") or 13 ("practice-0930").
 */
export function webPushTopic(name: string): string {
  let t = name.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  while (t.length % 4) t += '0';
  return t;
}

/** Whether a failed push may work if tried again: no answer, too many requests, or a server error. A refused request (4xx) never will (NOTIF-21). */
export function retryablePush(e: unknown): boolean {
  const code = (e as { statusCode?: unknown })?.statusCode;
  return typeof code !== 'number' || code === 429 || code >= 500;
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

/**
 * The same notification for the Android app, as an FCM message (AND-08): in the app's "Reminders" channel, with the
 * white TikTym ring in the status bar (android/app/src/main/res/drawable/ic_stat_tiktym.xml), held for up to 3 hours
 * like web push, and replacing an earlier one with the same tag. A tap opens the app (Android's default); `url` goes along as on the web.
 */
export function fcmMessage(token: string, payload: string, topic: string) {
  const d = JSON.parse(payload) as { title?: string; body?: string; url?: string; tag?: string };
  return {
    token,
    notification: { title: d.title || 'TikTym', body: d.body || '' },
    data: { url: d.url || '/' },
    android: {
      ttl: 3 * 3600 * 1000, priority: 'normal' as const, collapseKey: webPushTopic(topic),
      notification: { tag: d.tag || 'tiktym', icon: 'ic_stat_tiktym', color: '#16302E', channelId: FCM_CHANNEL },
    },
  };
}

/** The Android app's notification channel; the app creates it (src/state/push.ts), so its name shows in Android's settings. */
export const FCM_CHANNEL = 'reminders';

const FCM_GONE = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
const FCM_RETRY = ['messaging/internal-error', 'messaging/server-unavailable', 'messaging/unknown-error', 'messaging/message-rate-exceeded', 'messaging/quota-exceeded'];

/**
 * An FCM failure in web push's terms, so sendToDevices and retryablePush treat both alike (AND-08): a token that's gone
 * becomes 410 (removed), a busy or failing FCM 503 (retried), any other refusal 400 (logged, not retried). An error
 * with no FCM code (no answer at all) passes through unchanged, so it's retried.
 */
export function fcmFailure(e: unknown): unknown {
  const code = (e as { code?: unknown })?.code;
  if (typeof code !== 'string' || !code.startsWith('messaging/')) return e;
  const statusCode = FCM_GONE.includes(code) ? 410 : FCM_RETRY.includes(code) ? 503 : 400;
  return Object.assign(new Error((e as Error).message || code), { statusCode, body: code });
}
