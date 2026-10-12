// Push notifications written in the admin console and sent to a group of people (ADMIN-10, ADMIN-11). Pure, so it's
// unit-tested (tests/pushBroadcast.test.ts); index.ts finds the accounts, queues one task per person and sends.
import { addDays } from './recap.js';
import { localParts } from './shared/reminders.js';

/** Everyone with a device that allowed notifications, or only those of them who logged in the last 7 days. */
export type PushAudience = 'devices' | 'active7';
export const PUSH_AUDIENCES: PushAudience[] = ['devices', 'active7'];

export interface PushDraft { audience: PushAudience; title: string; body: string; url: string }

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

/** A draft from the console, or null. The link is a path inside the app ("/" by default), so a tap always opens TikTym. */
export function readPushDraft(v: unknown): PushDraft | null {
  const d = (v ?? {}) as Record<string, unknown>;
  const audience = PUSH_AUDIENCES.find(a => a === d.audience);
  const title = text(d.title, 60), body = text(d.body, 160);
  const url = d.url === undefined || d.url === '' ? '/' : text(d.url, 200);
  if (!audience || !title || !body || !url || !/^\/(?!\/)[^\s"<>]*$/.test(url)) return null;
  return { audience, title, body, url };
}

/** The lastLogged a person needs for the active audience, or null for everyone with a device. */
export const pushActiveFrom = (audience: PushAudience, today: string) => (audience === 'active7' ? addDays(today, -6) : null);

export const QUIET_FROM = '22:00', QUIET_UNTIL = '07:00', HELD_UNTIL = '10:00';

/**
 * Seconds to hold a push so it never arrives between 10 pm and 7 am in the person's time zone (ADMIN-11): 0 in the
 * day, otherwise until 10 am there (the next morning after 10 pm, this morning before 7 am).
 */
export function pushDelaySeconds(now: Date, tz: string): number {
  const { time } = localParts(now, tz);
  if (time >= QUIET_UNTIL && time < QUIET_FROM) return 0;
  const [h, m] = time.split(':').map(Number);
  const nowMin = h * 60 + m, target = 10 * 60;
  const minutes = time >= QUIET_FROM ? 24 * 60 - nowMin + target : target - nowMin;
  return minutes * 60 - now.getUTCSeconds();
}

/** What the service worker shows (public/push-sw.js): the badge is left alone, and each broadcast has its own tag. */
export const broadcastPushPayload = (d: Pick<PushDraft, 'title' | 'body' | 'url'>, id: string) =>
  JSON.stringify({ title: d.title, body: d.body, badge: null, url: d.url, tag: `bc-${id}` });
