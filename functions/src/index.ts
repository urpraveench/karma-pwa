// TikTym's Cloud Functions (asia-south1, next to the database): the welcome, one-tap-away, first-minute, weekly recap and comeback
// emails, the unsubscribe page, daily push reminders, and voice logging's AI call. What each email says, and who gets it, lives in mail.ts (unit-tested); this file reads,
// sends and records. NOTIFICATIONS.md has the plan.
import { applicationDefault, getApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { region as regionV1 } from 'firebase-functions/v1';
import { adminCheck, type AdminCaller } from './admin.js';
import { GEN1_METRIC, healthQuery, healthRows, RUN_METRIC } from './health.js';
import { billingFrom, billingQuery, level, LIMITS, periodStart, pickBillingTable, QUOTA_TZ, sumSeries, type LimitDef } from './costs.js';
import { historyEntry, type HistoryEntry } from './adminLog.js';
import { broadcastPushPayload, pushActiveFrom, pushDelaySeconds, readPushDraft, type PushAudience, type PushDraft } from './pushBroadcast.js';
import { audienceRange, broadcastCheck, broadcastEmail, readDraft, type Audience, type Draft, type Recipient } from './broadcast.js';
import { accountTotals, activeSince, cohortFrom, indiaDayRange, metricsDays, metricsFrom, statsDay, type Account, type EmailKind } from './adminStats.js';
import { comebackDue, comebackRange, daysAway, indiaToday, latestLogDate, type MailState } from './comeback.js';
import {
  comebackEmail, confirmUnsubscribePage, easiest, emailOn, FROM, firstName, justStarted, NUDGE_AFTER_MS, nudgeEmail, oneTapCheck, oneTapEmail,
  readUnsubscribe, recapEmail, REPLY_TO, START_AFTER_MS, unsubscribedPage, unsubscribeLink, welcomeEmail, type Email, type Practice,
} from './mail.js';
import { addDays, lastWeekStart, recapCheck, recapFrom, weekRecap, type RecapCategory, type RecapLog, type RecapMail } from './recap.js';
import webpush from 'web-push';
import { nudgeCheck, nudgePayload, nudgeSlotFor, practiceCheck, practicePayload, practiceTag, reminderCheck, reminderPayload, reminderTarget, sendToDevices, type ReminderDoc } from './push.js';
import { practicesLeft } from './shared/backlog.js';
import { badgeOn, localParts, slotAt, VAPID_PUBLIC_KEY } from './shared/reminders.js';
import type { AppData, Category, Log, PushDevice, Settings } from './shared/types.js';
import { quotaMessage, readVoiceRequest, voiceAnswer, voicePrompt, voiceQuota, voiceUsageNumbers, VOICE_MODEL, type VoiceUsage } from './voice.js';

setGlobalOptions({ region: 'asia-south1', maxInstances: 3 });
initializeApp();
const db = getFirestore();

/** Resend's API key (Sending access, tiktym.com): set with `firebase functions:secrets:set RESEND_API_KEY`. */
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
/** Signs unsubscribe links, so nobody can unsubscribe someone else. */
const UNSUBSCRIBE_SECRET = defineSecret('UNSUBSCRIBE_SECRET');
/** The private half of TikTym's web-push key pair (the public half is VAPID_PUBLIC_KEY in src/lib/reminders.ts). */
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');

/**
 * Server-only record per account, mail/{uid} (apps can't read or write it): when the account signed in first and when
 * the "one tap away" email is due (startDueAt, removed once handled), when first-run Start happened, when the
 * welcome went, when the first-minute nudge is due (removed once handled), the newest entry's date (lastLogged), the
 * week of the last recap, the absence the last comeback was for, and the India date of the last email (lastEmailDay).
 */
const mailDoc = (uid: string) => db.doc(`mail/${uid}`);
const settingsDoc = (uid: string) => db.doc(`users/${uid}/meta/settings`);

/** Counts one sent email of `kind` in today's admin totals (ADMIN-04); a retried send may count twice. */
const countEmail = (kind: EmailKind) =>
  db.doc(`adminStats/${indiaToday(new Date())}`).set({ emails: { [kind]: FieldValue.increment(1) } }, { merge: true })
    .catch(e => logger.warn('email count failed', { kind, error: String(e) }));

async function send(kind: EmailKind, to: string, email: Email, idempotencyKey: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: email.subject, html: email.html, text: email.text, headers: email.headers }),
  });
  if (!res.ok) throw new Error(`Resend said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  await countEmail(kind);
}

/** The account's active practices, in the order shown, with today's daily minutes. */
async function practices(uid: string): Promise<Practice[]> {
  const snap = await db.collection(`users/${uid}/categories`).get();
  return snap.docs.map(d => d.data())
    .filter(c => !c.archivedFrom)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(c => ({ name: String(c.name), minutes: Number(c.targets?.[c.targets.length - 1]?.minutes ?? 0), color: typeof c.color === 'string' ? c.color : undefined }));
}

async function recipient(uid: string): Promise<{ email: string; name: string } | null> {
  const u = await getAuth().getUser(uid).catch(() => null);
  return u?.email ? { email: u.email, name: firstName(u.displayName, u.email) } : null;
}

/**
 * A new account (any sign-in method): the "one tap away" email is due in about a day, unless first-run Start happens
 * first (NOTIF-15). A first-generation trigger: the second generation has no "user created" event without Identity Platform.
 */
export const signedUp = regionV1('asia-south1').auth.user().onCreate(async user => {
  const now = Date.now();
  await mailDoc(user.uid).set({ signedUpAt: Timestamp.fromMillis(now), startDueAt: Timestamp.fromMillis(now + START_AFTER_MS) }, { merge: true });
});

/** First-run Start: send the welcome (if tips are on), and set the first-minute nudge for about a day later (NOTIF-03). */
export const welcome = onDocumentWritten({ document: 'users/{uid}/meta/settings', secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET] }, async event => {
  const uid = event.params.uid;
  if (!justStarted(event.data?.before.data(), event.data?.after.data())) return;
  const startedAt = Timestamp.now();
  const first = await db.runTransaction(async t => {
    const ref = mailDoc(uid);
    if ((await t.get(ref)).data()?.startedAt) return false; // already recorded: the welcome goes once per account, even if Start is somehow saved twice
    t.set(ref, { startedAt, nudgeDueAt: Timestamp.fromMillis(startedAt.toMillis() + NUDGE_AFTER_MS), startDueAt: FieldValue.delete() }, { merge: true });
    return true;
  });
  if (!first) return;
  if (!emailOn(event.data?.after.data(), 'tips')) return;
  const to = await recipient(uid);
  if (!to) return;
  const email = welcomeEmail({ name: to.name, practices: await practices(uid), unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) });
  await send('welcome', to.email, email, `welcome-${uid}`);
  await mailDoc(uid).update({ welcomeAt: Timestamp.now(), lastEmailDay: indiaToday(new Date()) });
  logger.info('welcome sent', { uid });
});

/**
 * Every hour: the "one tap away" email for accounts a day past signing in that never tapped Start (NOTIF-15), and the
 * first-minute nudge for accounts a day past Start with nothing logged (NOTIF-04).
 */
export const firstMinute = onSchedule({ schedule: 'every 60 minutes', timeZone: 'Asia/Kolkata', secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET] }, async () => {
  const notStarted = await db.collection('mail').where('startDueAt', '<=', Timestamp.now()).limit(100).get();
  for (const doc of notStarted.docs) {
    const uid = doc.id;
    const handled = (outcome: string) => doc.ref.update({ startDueAt: FieldValue.delete(), oneTap: outcome, oneTapAt: Timestamp.now(), ...(outcome === 'sent' ? { lastEmailDay: indiaToday(new Date()) } : {}) });
    try {
      const [settings, to] = await Promise.all([settingsDoc(uid).get(), recipient(uid)]);
      const act = oneTapCheck(settings.data(), !!to);
      if (act !== 'send') { await handled(act); continue; }
      await send('oneTap', to!.email, oneTapEmail({ name: to!.name, unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) }), `one-tap-${uid}`);
      await handled('sent');
      logger.info('one-tap email sent', { uid });
    } catch (e) {
      logger.error('one-tap email failed; will retry next hour', { uid, error: String(e) });
    }
  }
  const due = await db.collection('mail').where('nudgeDueAt', '<=', Timestamp.now()).limit(100).get();
  for (const doc of due.docs) {
    const uid = doc.id;
    const handled = (outcome: string) => doc.ref.update({ nudgeDueAt: FieldValue.delete(), nudge: outcome, nudgeAt: Timestamp.now(), ...(outcome === 'sent' ? { lastEmailDay: indiaToday(new Date()) } : {}) });
    try {
      const [settings, months, list] = await Promise.all([settingsDoc(uid).get(), db.collection(`users/${uid}/months`).get(), practices(uid)]);
      const logged = months.docs.some(m => Object.keys(m.data().entries || {}).length > 0);
      if (logged) { await handled('logged'); continue; }
      if (!settings.exists || !emailOn(settings.data(), 'tips')) { await handled('off'); continue; }
      const to = await recipient(uid), practice = easiest(list);
      if (!to || !practice) { await handled('no-recipient'); continue; }
      await send('nudge', to.email, nudgeEmail({ name: to.name, practice, unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) }), `nudge-${uid}`);
      await handled('sent');
      logger.info('first-minute nudge sent', { uid });
    } catch (e) {
      logger.error('first-minute nudge failed; will retry next hour', { uid, error: String(e) });
    }
  }
});

/**
 * Mondays at 8 am India time: queue last week's recap for each account with an entry in the last two weeks (NOTIF-06,
 * NOTIF-16). The query reads only those accounts (mail/{uid}.lastLogged, kept by trackLastLogged); the queue sends at a
 * steady rate and retries, so this never runs into the 9-minute limit. The task id stops a rerun queueing anyone twice.
 */
export const weeklyRecap = onSchedule({ schedule: '0 8 * * 1', timeZone: 'Asia/Kolkata' }, async () => {
  const week = lastWeekStart(new Date()), today = indiaToday(new Date());
  const active = await db.collection('mail').where('lastLogged', '>=', recapFrom(week)).get();
  const due = active.docs.filter(d => recapCheck(d.data() as RecapMail, week, today) === 'send');
  const queue = getFunctions().taskQueue('locations/asia-south1/functions/recapSend');
  const queued = await Promise.all(due.map(d => queue.enqueue({ uid: d.id, week }, { id: `recap-${d.id}-${week}` }).then(() => 1, (e: { code?: string }) => {
    if (e?.code === 'functions/task-already-exists') return 0;
    throw e;
  })));
  logger.info('weekly recaps queued', { week, active: active.size, queued: queued.reduce<number>((s, n) => s + n, 0) });
});

/** Sends one weekly recap, from the queue: at most 2 a second, retried on failure. Checks again before sending (NOTIF-06, NOTIF-16). */
export const recapSend = onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 120 },
  rateLimits: { maxDispatchesPerSecond: 2, maxConcurrentDispatches: 4 },
  secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET],
}, async req => {
  const { uid, week } = (req.data ?? {}) as { uid?: unknown; week?: unknown };
  if (typeof uid !== 'string' || !uid || typeof week !== 'string') return;
  const today = indiaToday(new Date());
  const [settings, mail] = await Promise.all([settingsDoc(uid).get(), mailDoc(uid).get()]);
  const check = recapCheck(mail.data() as RecapMail | undefined, week, today);
  if (check !== 'send' || !settings.exists || !emailOn(settings.data(), 'recap')) {
    logger.info('weekly recap skipped', { uid, week, why: check === 'send' ? 'off' : check });
    return;
  }
  const months = [...new Set([addDays(week, -7), addDays(week, 6)].map(d => d.slice(0, 7)))];
  const [to, cats, monthDocs] = await Promise.all([
    recipient(uid),
    db.collection(`users/${uid}/categories`).get(),
    db.getAll(...months.map(m => db.doc(`users/${uid}/months/${m}`))),
  ]);
  if (!to) return;
  const categories = cats.docs.map(d => d.data() as RecapCategory);
  const logs = monthDocs.flatMap(m => Object.values((m.data()?.entries || {}) as Record<string, RecapLog>));
  const recap = weekRecap(categories, logs, week);
  if (!recap) return;
  const current = categories.filter(c => !c.archivedFrom).map(c => ({ name: c.name, minutes: Number(c.targets?.[c.targets.length - 1]?.minutes ?? 0) }));
  const email = recapEmail({ name: to.name, recap, easiest: easiest(current)?.name, unsubscribe: unsubscribeLink(uid, 'recap', UNSUBSCRIBE_SECRET.value()) });
  await send('recap', to.email, email, `recap-${uid}-${week}`);
  await mailDoc(uid).set({ recapWeek: week, recapAt: Timestamp.now(), lastEmailDay: today }, { merge: true });
  logger.info('weekly recap sent', { uid, week });
});

/** Keeps mail/{uid}.lastLogged, the newest entry's date, as entries are saved, so the comeback job only looks at people who are away (NOTIF-07). */
export const trackLastLogged = onDocumentWritten({ document: 'users/{uid}/months/{month}' }, async event => {
  const latest = latestLogDate(event.data?.after.data()?.entries);
  if (!latest) return;
  const ref = mailDoc(event.params.uid);
  const known = (await ref.get()).data()?.lastLogged;
  if (!known || latest > known) await ref.set({ lastLogged: latest }, { merge: true });
});

/**
 * Every morning at 9 am India time: queue a comeback for each account away 4 to 14 days (NOTIF-07). The query reads
 * only those accounts; the queue sends at a steady rate and retries, so this scales past the 9-minute limit.
 */
export const comebackDaily = onSchedule({ schedule: '0 9 * * *', timeZone: 'Asia/Kolkata' }, async () => {
  const today = indiaToday(new Date()), { from, to } = comebackRange(today);
  const away = await db.collection('mail').where('lastLogged', '>=', from).where('lastLogged', '<=', to).get();
  const due = away.docs.filter(d => comebackDue(d.data() as MailState, today));
  const queue = getFunctions().taskQueue('locations/asia-south1/functions/comebackSend');
  await Promise.all(due.map(d => queue.enqueue({ uid: d.id })));
  logger.info('comebacks queued', { today, away: away.size, queued: due.length });
});

/** Sends one comeback, from the queue: at most 2 a second, retried on failure. Checks again before sending (NOTIF-07, NOTIF-08). */
export const comebackSend = onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 120 },
  rateLimits: { maxDispatchesPerSecond: 2, maxConcurrentDispatches: 4 },
  secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET],
}, async req => {
  const uid = String((req.data as { uid?: unknown })?.uid ?? '');
  if (!uid) return;
  const today = indiaToday(new Date());
  const [mail, settings] = await Promise.all([mailDoc(uid).get(), settingsDoc(uid).get()]);
  const m = mail.data() as MailState | undefined;
  if (!comebackDue(m, today) || !emailOn(settings.data(), 'tips')) return; // logged since, already sent, or switched off
  const [to, list] = await Promise.all([recipient(uid), practices(uid)]);
  const practice = easiest(list);
  if (!to || !practice) return;
  const email = comebackEmail({ name: to.name, practice, days: daysAway(m!.lastLogged!, today), unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) });
  await send('comeback', to.email, email, `comeback-${uid}-${m!.lastLogged}`);
  await mailDoc(uid).set({ comebackFor: m!.lastLogged, comebackAt: Timestamp.now(), lastEmailDay: today }, { merge: true });
  logger.info('comeback sent', { uid, away: daysAway(m!.lastLogged!, today) });
});

const reminderDoc = (uid: string) => db.doc(`reminders/${uid}`);

/** Keeps reminders/{uid} in step with the account's reminder settings, its devices and its practices' own reminders (NOTIF-09, NOTIF-20). */
async function syncReminder(uid: string) {
  const [settings, devices] = await Promise.all([settingsDoc(uid).get(), db.collection(`users/${uid}/devices`).count().get()]);
  const n = devices.data().count;
  if (!n && !(await reminderDoc(uid).get()).exists) return; // never allowed notifications: nothing to keep
  const cats = n ? (await db.collection(`users/${uid}/categories`).get()).docs.map(d => d.data() as Category) : [];
  await reminderDoc(uid).set(reminderTarget(settings.data() as Settings | undefined, n, new Date(), cats), { merge: true });
}

export const reminderSettings = onDocumentWritten({ document: 'users/{uid}/meta/settings' }, event => syncReminder(event.params.uid));
export const reminderDevices = onDocumentWritten({ document: 'users/{uid}/devices/{id}' }, event => syncReminder(event.params.uid));
/** A practice's reminder time changed, or the practice was archived, restored or deleted (NOTIF-20). */
export const reminderPractices = onDocumentWritten({ document: 'users/{uid}/categories/{id}' }, event => {
  const before = event.data?.before.data(), after = event.data?.after.data();
  if ((before?.remind ?? null) === (after?.remind ?? null) && (before?.archivedFrom ?? null) === (after?.archivedFrom ?? null)) return;
  return syncReminder(event.params.uid);
});

/**
 * Every 15 minutes: queue a reminder for each account whose chosen time falls in this slot (NOTIF-09), the evening
 * log check for each account whose 8 pm does (NOTIF-18), and practice reminders set for this slot (NOTIF-19). The queries read only those accounts, and the queue sends at a
 * steady rate with retries, so it scales like the comeback.
 */
export const remindersDue = onSchedule({ schedule: '*/15 * * * *', timeZone: 'UTC' }, async () => {
  const slot = slotAt(new Date());
  const [due, nudges, practices] = await Promise.all([
    db.collection('reminders').where('slot', '==', slot).get(),
    db.collection('reminders').where('nudgeSlot', '==', slot).get(),
    db.collection('reminders').where('practiceSlots', 'array-contains', slot).get(),
  ]);
  const queue = getFunctions().taskQueue('locations/asia-south1/functions/reminderSend');
  await Promise.all([
    ...due.docs.map(d => queue.enqueue({ uid: d.id })),
    ...nudges.docs.map(d => queue.enqueue({ uid: d.id, kind: 'nudge' })),
    ...practices.docs.map(d => queue.enqueue({ uid: d.id, kind: 'practice' })),
  ]);
  if (due.size || nudges.size || practices.size) logger.info('reminders queued', { slot, queued: due.size, nudges: nudges.size, practices: practices.size });
});

/** An account's settings, practices and entries, as the app has them. */
async function accountData(uid: string): Promise<AppData> {
  const [settings, cats, months] = await Promise.all([
    settingsDoc(uid).get(), db.collection(`users/${uid}/categories`).get(), db.collection(`users/${uid}/months`).get(),
  ]);
  return {
    settings: (settings.data() || {}) as Settings,
    categories: cats.docs.map(d => d.data() as Category),
    logs: months.docs.flatMap(m => Object.values((m.data().entries || {}) as Record<string, Log>)),
  };
}

/** Sends one payload to each of the account's devices, removing those that are gone. Throws if none got it, so the queue retries. */
async function pushToAccount(uid: string, payload: string, topic: string): Promise<number> {
  const devices = await db.collection(`users/${uid}/devices`).get();
  const options = {
    vapidDetails: { subject: 'mailto:hello@tiktym.com', publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY.value() },
    TTL: 3 * 3600, urgency: 'normal' as const, topic,
  };
  const { sent, removed, failed } = await sendToDevices(devices.docs,
    d => { const device = d.data() as PushDevice; return webpush.sendNotification({ endpoint: device.endpoint, keys: device.keys }, payload, options); },
    d => d.ref.delete());
  if (failed) logger.warn('push failed on a device', { uid, error: String(failed) });
  if (!sent && failed) throw failed; // nothing reached: let the queue retry
  if (removed) logger.info('gone devices removed', { uid, removed });
  return sent;
}

/**
 * Sends one account's daily reminder if anything is still due today (NOTIF-09 to NOTIF-11); for kind 'nudge', the
 * 8 pm evening log check if nothing is logged today (NOTIF-18); for kind 'practice', the practices' own reminders whose
 * time has come, if those practices are still due (NOTIF-19).
 */
export const reminderSend = onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 60 },
  rateLimits: { maxDispatchesPerSecond: 20, maxConcurrentDispatches: 10 },
  secrets: [VAPID_PRIVATE_KEY],
}, async req => {
  const { uid: rawUid, kind } = (req.data || {}) as { uid?: unknown; kind?: unknown };
  const uid = String(rawUid ?? '');
  if (!uid) return;
  const doc = (await reminderDoc(uid).get()).data() as ReminderDoc | undefined;
  if (!doc) return;
  const now = new Date();

  if (kind === 'nudge') {
    if (!doc.nudgeSlot) return;
    const data = await accountData(uid);
    const date = localParts(now, doc.tz).date;
    const left = practicesLeft(data, date);
    const check = nudgeCheck(doc, now, { logged: data.logs.some(l => l.date === date && l.minutes > 0), due: left.length > 0 });
    if (check.slot !== doc.nudgeSlot) await reminderDoc(uid).update({ nudgeSlot: check.slot }); // daylight saving moved it
    if (check.act !== 'send') { logger.info('evening check skipped', { uid, why: check.act }); return; }
    const sent = await pushToAccount(uid, nudgePayload(left.length, badgeOn(data.settings)), 'log-nudge');
    if (sent) await reminderDoc(uid).update({ nudgeSent: check.date });
    logger.info('evening check sent', { uid, devices: sent });
    return;
  }

  if (kind === 'practice') {
    const data = await accountData(uid);
    const date = localParts(now, doc.tz).date;
    const left = practicesLeft(data, date);
    const check = practiceCheck(data.categories, doc, now, new Set(left.map(c => c.id)));
    const sent = check.send.length ? await pushToAccount(uid, practicePayload(check.send, left.length, badgeOn(data.settings)), practiceTag(check.send[0].remind)) : 0;
    const fix: Partial<ReminderDoc> = {};
    if (check.slots.join() !== (doc.practiceSlots ?? []).join()) fix.practiceSlots = check.slots; // daylight saving moved them
    if (check.handled.length) {
      const today = Object.entries(doc.practiceSent ?? {}).filter(([, d]) => d === check.date); // older days are dropped
      fix.practiceSent = Object.fromEntries([...today, ...check.handled.map(id => [id, check.date])]);
    }
    if (Object.keys(fix).length) await reminderDoc(uid).update(fix);
    logger.info(sent ? 'practice reminder sent' : 'practice reminder skipped', { uid, devices: sent, practices: check.send.length, handled: check.handled.length });
    return;
  }

  if (!doc.slot) return;
  const check = reminderCheck(doc, now);
  const fix: Partial<ReminderDoc> = {};
  if (check.slot !== doc.slot) fix.slot = check.slot; // daylight saving moved it
  if (doc.nudgeSlot === undefined) fix.nudgeSlot = nudgeSlotFor(undefined, doc.devices, doc.tz, check.date); // records from before NOTIF-18
  if (Object.keys(fix).length) await reminderDoc(uid).update(fix);
  if (check.act !== 'send') return;

  const data = await accountData(uid);
  const left = practicesLeft(data, check.date);
  if (!left.length) return; // today is clear, or a rest day
  const sent = await pushToAccount(uid, reminderPayload(left, badgeOn(data.settings)), 'daily-reminder');
  if (sent) await reminderDoc(uid).update({ lastSent: check.date });
  logger.info('reminder sent', { uid, devices: sent, left: left.length });
});

/**
 * app.tiktym.com/unsubscribe (NOTIF-05). Opening the link asks for a click; a POST turns the email type off in the
 * account. Gmail's own button posts "List-Unsubscribe=One-Click" (RFC 8058) and gets a plain 200.
 */
export const unsubscribe = onRequest({ secrets: [UNSUBSCRIBE_SECRET], cors: false }, async (req, res) => {
  const found = readUnsubscribe(req.query as Record<string, unknown>, UNSUBSCRIBE_SECRET.value());
  res.set('Cache-Control', 'no-store');
  if (!found) { res.status(400).type('html').send(unsubscribedPage(null)); return; }
  if (req.method === 'GET') { res.type('html').send(confirmUnsubscribePage(found.kind, req.originalUrl)); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  await settingsDoc(found.uid).set({ emails: { [found.kind]: false } }, { merge: true });
  logger.info('unsubscribed', { uid: found.uid, kind: found.kind });
  const oneClick = String((req.body as Record<string, unknown> | undefined)?.['List-Unsubscribe'] ?? '') === 'One-Click';
  if (oneClick) res.status(200).send('Unsubscribed');
  else res.type('html').send(unsubscribedPage(found.kind));
});

/**
 * Voice logging (LOG-26, LOG-30): a signed-in app sends one short recording and its practice names; Gemini on Vertex AI
 * turns it into a transcript and suggested entries. App Check (without replay protection, which needs an extra IAM role),
 * and a per-account limit counted
 * in voiceUsage/{uid} (server-only), keep the AI bill bounded. The recording and transcript are never stored or logged.
 */
export const understandVoice = onCall({ enforceAppCheck: true, timeoutSeconds: 40, memory: '512MiB' }, async req => {
  const started = Date.now();
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in again, then retry your recording.');
  const voice = readVoiceRequest(req.data);
  if (!voice) throw new HttpsError('invalid-argument', 'I could not read that recording. Try again or type your update.');

  const quota = await db.runTransaction(async tx => {
    const ref = db.doc(`voiceUsage/${uid}`);
    const check = voiceQuota((await tx.get(ref)).data() as Partial<VoiceUsage> | undefined, new Date());
    if (check.ok) tx.set(ref, check.next);
    return check;
  });
  if (!quota.ok) {
    logger.info('voice limit reached', { uid, reason: quota.reason });
    throw new HttpsError('resource-exhausted', quotaMessage(quota.reason));
  }

  const aiStarted = Date.now();
  const project = process.env.GCLOUD_PROJECT;
  const token = await getApp().options.credential!.getAccessToken();
  const res = await fetch(`https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${VOICE_MODEL}:generateContent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(voicePrompt(voice)),
    signal: AbortSignal.timeout(30_000),
  }).catch(error => { logger.warn('voice AI unreachable', { uid, error: String(error) }); return null; });
  if (!res?.ok) {
    if (res) logger.warn('voice AI failed', { uid, status: res.status, body: (await res.text()).slice(0, 300) });
    throw new HttpsError('unavailable', 'Voice processing is busy right now. Try this recording again in a moment.');
  }
  const response = await res.json();
  const aiMs = Date.now() - aiStarted;
  const answer = voiceAnswer(response);
  // Where the time goes (LOG-30): Gemini's part vs the whole call. Token counts only, never the audio or words.
  logger.info('voice understood', { uid, aiMs, totalMs: Date.now() - started, audioKB: Math.round(voice.audio.length * 0.75 / 1024), ok: Boolean(answer), ...voiceUsageNumbers(response) });
  if (!answer) throw new HttpsError('internal', 'I could not understand that recording. Try again or type your update.');
  return answer;
});

/** Deleting an account also deletes its voice usage count (voiceUsage/{uid}), which the app itself can't reach. */
export const voiceUsageCleanup = regionV1('asia-south1').auth.user().onDelete(async user => {
  await db.doc(`voiceUsage/${user.uid}`).delete();
});

/**
 * At 00:30 India time: yesterday's account totals for the admin console, in adminStats/{day} (ADMIN-04). Sign-up dates
 * come from Auth; only the last two weeks' sign-ups have their mail record read; the rest are count queries. Running
 * again replaces the day's numbers and keeps its email counts.
 */
export const adminStatsNightly = onSchedule({ schedule: '30 0 * * *', timeZone: 'Asia/Kolkata', timeoutSeconds: 300 }, async () => {
  const day = statsDay(new Date());
  const accounts: (Account & { uid: string })[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const u of page.users) accounts.push({ uid: u.uid, createdDay: indiaToday(new Date(u.metadata.creationTime)) });
    pageToken = page.pageToken;
  } while (pageToken);
  const recent = accounts.filter(a => a.createdDay >= cohortFrom(day) && a.createdDay <= day);
  const mails = recent.length ? await db.getAll(...recent.map(a => mailDoc(a.uid))) : [];
  mails.forEach((m, i) => { recent[i].lastLogged = m.data()?.lastLogged; });

  const since = activeSince(day), { start, end } = indiaDayRange(day);
  const count = (q: FirebaseFirestore.Query) => q.count().get().then(r => r.data().count);
  const [active1, active7, active28, started, pushAccounts] = await Promise.all([
    count(db.collection('mail').where('lastLogged', '>=', since.active1)),
    count(db.collection('mail').where('lastLogged', '>=', since.active7)),
    count(db.collection('mail').where('lastLogged', '>=', since.active28)),
    count(db.collection('mail').where('startedAt', '>=', Timestamp.fromDate(start)).where('startedAt', '<', Timestamp.fromDate(end))),
    count(db.collection('reminders').where('devices', '>', 0)),
  ]);
  const totals = { ...accountTotals(accounts, day), started, active1, active7, active28, pushAccounts, computedAt: Timestamp.now() };
  await db.doc(`adminStats/${day}`).set(totals, { merge: true });
  logger.info('admin totals saved', { day, accounts: totals.accounts, active7 });
});

/** Refuses anyone but an admin (ADMIN-02); every admin function calls this first. */
function requireAdmin(auth: AdminCaller): void {
  const check = adminCheck(auth);
  if (check !== 'ok') throw new HttpsError(check, 'Admins only.');
}

/** The metrics page (ADMIN-06): the last 30 days of admin totals and anonymous daily totals, 60 reads. */
export const adminMetrics = onCall(async req => {
  requireAdmin(req.auth);
  const days = metricsDays(new Date());
  const [admin, stats] = await Promise.all([
    db.getAll(...days.map(d => db.doc(`adminStats/${d}`))),
    db.getAll(...days.map(d => db.doc(`stats/${d}`))),
  ]);
  return metricsFrom(days, admin.map(d => d.data()), stats.map(d => d.data()));
});

/** The accounts an audience is found by (ADMIN-07): every account with an email for everyone, else by last-logged date. */
async function audienceUids(audience: Audience): Promise<string[]> {
  const range = audienceRange(audience, indiaToday(new Date()));
  if (!range) {
    const uids: string[] = [];
    let pageToken: string | undefined;
    do {
      const page = await getAuth().listUsers(1000, pageToken);
      uids.push(...page.users.filter(u => u.email).map(u => u.uid));
      pageToken = page.pageToken;
    } while (pageToken);
    return uids;
  }
  let q: FirebaseFirestore.Query = db.collection('mail');
  if (range.from) q = q.where('lastLogged', '>=', range.from);
  if (range.to) q = q.where('lastLogged', '<=', range.to);
  return (await q.select().get()).docs.map(d => d.id);
}

function draftFrom(data: unknown): Draft {
  const draft = readDraft((data as { draft?: unknown })?.draft);
  if (!draft) throw new HttpsError('invalid-argument', 'Fill in the subject, heading and text; a button needs a label and an https link.');
  return draft;
}

/** The email as people will see it, addressed to you, and how many people the audience could reach (ADMIN-07). */
export const adminEmailPreview = onCall({ secrets: [UNSUBSCRIBE_SECRET], timeoutSeconds: 120 }, async req => {
  requireAdmin(req.auth);
  const draft = draftFrom(req.data);
  const me = await recipient(req.auth!.uid);
  const email = broadcastEmail(draft, me?.name ?? '', unsubscribeLink(req.auth!.uid, 'news', UNSUBSCRIBE_SECRET.value()));
  return { subject: email.subject, html: email.html, count: (await audienceUids(draft.audience)).length };
});

/** Sends the draft to your own address only, and records it in the send history (ADMIN-07, ADMIN-12). */
export const adminEmailTest = onCall({ secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET] }, async req => {
  requireAdmin(req.auth);
  const draft = draftFrom(req.data);
  const me = await recipient(req.auth!.uid);
  if (!me) throw new HttpsError('failed-precondition', 'Your account has no email address.');
  const ref = db.collection('adminLog').doc();
  await send('test', me.email, broadcastEmail(draft, me.name, unsubscribeLink(req.auth!.uid, 'news', UNSUBSCRIBE_SECRET.value())), `test-${ref.id}`);
  await ref.set({ kind: 'email-test', ...draft, to: me.email, by: me.email, createdAt: Timestamp.now(), queued: 1, sent: 1 });
  return { to: me.email };
});

/**
 * Sends the draft to its audience (ADMIN-08, ADMIN-09): records it in adminLog/{id}, then queues one task per person,
 * sent 2 a second with retries. The task id stops anyone being queued twice for the same broadcast.
 */
export const adminEmailSend = onCall({ timeoutSeconds: 540, memory: '512MiB' }, async req => {
  requireAdmin(req.auth);
  const draft = draftFrom(req.data);
  const uids = await audienceUids(draft.audience);
  const ref = db.collection('adminLog').doc();
  await ref.set({ kind: 'email', ...draft, by: req.auth!.token.email ?? req.auth!.uid, createdAt: Timestamp.now(), queued: 0, sent: 0, skipped: 0, failed: 0 });
  const queue = getFunctions().taskQueue('locations/asia-south1/functions/broadcastSend');
  let queued = 0;
  for (let i = 0; i < uids.length; i += 100) {
    const added = await Promise.all(uids.slice(i, i + 100).map(uid => queue.enqueue({ id: ref.id, uid }, { id: `bc-${ref.id}-${uid}` }).then(() => 1, (e: { code?: string }) => {
      if (e?.code === 'functions/task-already-exists') return 0;
      throw e;
    })));
    queued += added.reduce<number>((a, b) => a + b, 0);
  }
  await ref.update({ queued });
  logger.info('broadcast queued', { id: ref.id, audience: draft.audience, queued });
  return { id: ref.id, queued };
});

/** Sends one broadcast email, from the queue: checks News is on and nobody gets it twice, then counts the outcome (ADMIN-08, ADMIN-09). */
export const broadcastSend = onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 120 },
  rateLimits: { maxDispatchesPerSecond: 2, maxConcurrentDispatches: 4 },
  secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET],
}, async req => {
  const { id, uid } = (req.data ?? {}) as { id?: unknown; uid?: unknown };
  if (typeof id !== 'string' || !id || typeof uid !== 'string' || !uid) return;
  const log = db.doc(`adminLog/${id}`);
  const [entry, settings, mail] = await Promise.all([log.get(), settingsDoc(uid).get(), mailDoc(uid).get()]);
  const draft = readDraft(entry.data());
  if (!draft) return;
  const today = indiaToday(new Date());
  const m = mail.data() as Recipient | undefined;
  const check = broadcastCheck({ settings: settings.data(), lastEmailDay: m?.lastEmailDay, broadcasts: m?.broadcasts }, id, today);
  if (check === 'already-sent') return;
  if (check !== 'send') { await log.update({ skipped: FieldValue.increment(1), [`skippedWhy.${check}`]: FieldValue.increment(1) }); return; }
  const to = await recipient(uid);
  if (!to) { await log.update({ skipped: FieldValue.increment(1), 'skippedWhy.no-email': FieldValue.increment(1) }); return; }
  try {
    await send('news', to.email, broadcastEmail(draft, to.name, unsubscribeLink(uid, 'news', UNSUBSCRIBE_SECRET.value())), `bc-${id}-${uid}`);
  } catch (e) {
    if (req.retryCount >= 2) await log.update({ failed: FieldValue.increment(1) }); // the last try
    throw e;
  }
  await mailDoc(uid).set({ lastEmailDay: today, broadcasts: FieldValue.arrayUnion(id) }, { merge: true });
  await log.update({ sent: FieldValue.increment(1) });
});

/** Accounts with a device that allowed notifications, and their time zones; only recent loggers for active7 (ADMIN-10). */
async function pushAudience(audience: PushAudience): Promise<{ uid: string; tz: string }[]> {
  const withDevices = await db.collection('reminders').where('devices', '>', 0).select('tz').get();
  const from = pushActiveFrom(audience, indiaToday(new Date()));
  const active = from ? new Set((await db.collection('mail').where('lastLogged', '>=', from).select().get()).docs.map(d => d.id)) : null;
  return withDevices.docs.filter(d => !active || active.has(d.id)).map(d => ({ uid: d.id, tz: String(d.data().tz || 'Asia/Kolkata') }));
}

function pushDraftFrom(data: unknown): PushDraft {
  const draft = readPushDraft((data as { draft?: unknown })?.draft);
  if (!draft) throw new HttpsError('invalid-argument', 'Fill in the title (up to 60 characters) and text (up to 160); a link must be a path in the app, like /.');
  return draft;
}

/** How many people a push audience reaches (ADMIN-10). */
export const adminPushCount = onCall(async req => {
  requireAdmin(req.auth);
  return { count: (await pushAudience(pushDraftFrom(req.data).audience)).length };
});

/** Sends the draft to your own devices only, straight away, and records it in the send history (ADMIN-10, ADMIN-12). */
export const adminPushTest = onCall({ secrets: [VAPID_PRIVATE_KEY] }, async req => {
  requireAdmin(req.auth);
  const draft = pushDraftFrom(req.data);
  const ref = db.collection('adminLog').doc();
  const sent = await pushToAccount(req.auth!.uid, broadcastPushPayload(draft, ref.id), `bc${ref.id}`).catch(() => 0);
  if (!sent) throw new HttpsError('failed-precondition', 'None of your devices got it. Allow notifications in TikTym on your phone, then try again.');
  await ref.set({ kind: 'push-test', ...draft, by: req.auth!.token.email ?? req.auth!.uid, createdAt: Timestamp.now(), queued: 1, sent: 1, devices: sent });
  return { devices: sent };
});

/**
 * Sends the draft to its audience (ADMIN-10, ADMIN-11): records it in adminLog/{id}, then queues one task per person,
 * held until 10 am in their time zone when it's between 10 pm and 7 am there. The task id stops anyone being queued twice.
 */
export const adminPushSend = onCall({ timeoutSeconds: 540, memory: '512MiB' }, async req => {
  requireAdmin(req.auth);
  const draft = pushDraftFrom(req.data);
  const people = await pushAudience(draft.audience);
  const ref = db.collection('adminLog').doc();
  await ref.set({ kind: 'push', ...draft, by: req.auth!.token.email ?? req.auth!.uid, createdAt: Timestamp.now(), queued: 0, held: 0, sent: 0, skipped: 0, failed: 0 });
  const queue = getFunctions().taskQueue('locations/asia-south1/functions/broadcastPushSend');
  const now = new Date();
  let queued = 0, held = 0;
  for (let i = 0; i < people.length; i += 100) {
    const added = await Promise.all(people.slice(i, i + 100).map(p => {
      const delay = pushDelaySeconds(now, p.tz);
      return queue.enqueue({ id: ref.id, uid: p.uid }, { id: `bp-${ref.id}-${p.uid}`, ...(delay ? { scheduleDelaySeconds: delay } : {}) })
        .then(() => (delay ? 2 : 1), (e: { code?: string }) => {
          if (e?.code === 'functions/task-already-exists') return 0;
          throw e;
        });
    }));
    queued += added.filter(Boolean).length;
    held += added.filter(n => n === 2).length;
  }
  await ref.update({ queued, held });
  logger.info('push broadcast queued', { id: ref.id, audience: draft.audience, queued, held });
  return { id: ref.id, queued, held };
});

/** Sends one broadcast push, from the queue, to all of the person's devices, once; counts the outcome (ADMIN-10, ADMIN-11). */
export const broadcastPushSend = onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 60 },
  rateLimits: { maxDispatchesPerSecond: 20, maxConcurrentDispatches: 10 },
  secrets: [VAPID_PRIVATE_KEY],
}, async req => {
  const { id, uid } = (req.data ?? {}) as { id?: unknown; uid?: unknown };
  if (typeof id !== 'string' || !id || typeof uid !== 'string' || !uid) return;
  const log = db.doc(`adminLog/${id}`);
  const [entry, reminder] = await Promise.all([log.get(), reminderDoc(uid).get()]);
  const draft = readPushDraft(entry.data());
  if (!draft) return;
  if ((reminder.data()?.broadcasts as string[] | undefined)?.includes(id)) return; // already sent: a task that ran twice
  let sent: number;
  try {
    sent = await pushToAccount(uid, broadcastPushPayload(draft, id), `bc${id}`);
  } catch (e) {
    if (req.retryCount >= 2) await log.update({ failed: FieldValue.increment(1) }); // the last try
    throw e;
  }
  if (!sent) { await log.update({ skipped: FieldValue.increment(1), 'skippedWhy.no-device': FieldValue.increment(1) }); return; }
  await reminderDoc(uid).set({ broadcasts: FieldValue.arrayUnion(id) }, { merge: true });
  await log.update({ sent: FieldValue.increment(1) });
});

/** The send history (ADMIN-12): the newest 50 broadcasts and tests, with how far each has got. */
export const adminHistory = onCall(async req => {
  requireAdmin(req.auth);
  const snap = await db.collection('adminLog').orderBy('createdAt', 'desc').limit(50).get();
  return { entries: snap.docs.map(d => historyEntry(d.id, d.data())).filter((e): e is HistoryEntry => !!e) };
});

const projectId = () => process.env.GCLOUD_PROJECT || getApp().options.projectId || 'tiktym';

/** Calls a Google Cloud REST API as the functions' service account. */
async function googleApi<T>(url: string, body?: unknown): Promise<T> {
  const { access_token } = await applicationDefault().getAccessToken();
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({})) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
  return json as T;
}

/** The sum of a metric from `start` to now, trying each metric type in order until one has data (0 if none do). */
async function metricTotal(types: string[], start: Date): Promise<number> {
  for (const type of types) {
    const q = new URLSearchParams({
      filter: `metric.type = "${type}"`, 'interval.startTime': start.toISOString(), 'interval.endTime': new Date().toISOString(),
      'aggregation.alignmentPeriod': `${Math.max(60, Math.ceil((Date.now() - start.getTime()) / 1000))}s`,
      'aggregation.perSeriesAligner': 'ALIGN_SUM', 'aggregation.crossSeriesReducer': 'REDUCE_SUM',
    });
    const sum = sumSeries(await googleApi(`https://monitoring.googleapis.com/v3/projects/${projectId()}/timeSeries?${q}`));
    if (sum !== null) return sum;
  }
  return 0;
}

/** Emails TikTym sent in the India day or month so far, from adminStats emails counts. */
async function emailsSent(period: 'day' | 'month'): Promise<number> {
  const today = indiaToday(new Date());
  const docs = period === 'day'
    ? [await db.doc(`adminStats/${today}`).get()]
    : (await db.collection('adminStats').where(FieldPath.documentId(), '>=', `${today.slice(0, 8)}01`).where(FieldPath.documentId(), '<=', today).get()).docs;
  return docs.reduce((s, d) => s + Object.values((d.data()?.emails ?? {}) as Record<string, number>).reduce((a, b) => a + (Number(b) || 0), 0), 0);
}

/** Costs and limits (ADMIN-13): each part fails on its own, so one missing permission never blanks the page. */
export const adminCosts = onCall({ timeoutSeconds: 60 }, async req => {
  requireAdmin(req.auth);
  const project = projectId(), now = new Date();
  const billing = (async () => {
    const api = `https://bigquery.googleapis.com/bigquery/v2/projects/${project}`;
    const ds = await googleApi<{ datasets?: { datasetReference: { datasetId: string } }[] }>(`${api}/datasets`);
    const ids = (ds.datasets ?? []).map(d => d.datasetReference.datasetId).filter(id => /billing/i.test(id));
    const datasets = await Promise.all(ids.map(async id => ({
      id, tables: ((await googleApi<{ tables?: { tableReference: { tableId: string } }[] }>(`${api}/datasets/${id}/tables`)).tables ?? []).map(t => t.tableReference.tableId),
    })));
    const table = pickBillingTable(datasets);
    if (!table) return { status: 'unavailable' as const, reason: ids.length ? 'The billing export has no data yet; it can take a day after turning it on.' : 'No billing export dataset found.' };
    const r = await googleApi<{ rows?: { f: { v: string | null }[] }[]; jobComplete?: boolean }>(`${api}/queries`, { query: billingQuery(project, table), useLegacySql: false, timeoutMs: 20_000 });
    if (r.jobComplete === false) return { status: 'unavailable' as const, reason: 'The billing query is still running. Refresh in a minute.' };
    return { status: 'ok' as const, ...billingFrom(r) };
  })().catch((e: Error) => ({ status: 'unavailable' as const, reason: e.message }));
  const limits = Promise.all(LIMITS.map(async (l: LimitDef) => {
    const base = { id: l.id, label: l.label, limit: l.limit, unit: l.unit, link: l.link.replace('{project}', project) };
    try {
      const used = 'emails' in l.source ? await emailsSent(l.period) : await metricTotal(l.source.metrics, periodStart(now, l.period, QUOTA_TZ));
      return { ...base, used, level: level(used, l.limit) };
    } catch (e) {
      return { ...base, used: null, level: null, error: (e as Error).message };
    }
  }));
  return { billing: await billing, limits: await limits };
});

/** Function health (ADMIN-14): each function's runs and errors in the last 24 hours, errors first. */
export const adminHealth = onCall({ timeoutSeconds: 60 }, async req => {
  requireAdmin(req.auth);
  const project = projectId(), now = new Date();
  const ask = (metric: string) => googleApi<{ timeSeries?: [] }>(`https://monitoring.googleapis.com/v3/projects/${project}/timeSeries?${healthQuery(metric, now)}`);
  try {
    const [run, gen1] = await Promise.all([ask(RUN_METRIC), ask(GEN1_METRIC)]);
    return { status: 'ok' as const, rows: healthRows(run, gen1, project) };
  } catch (e) {
    return { status: 'unavailable' as const, reason: (e as Error).message };
  }
});
