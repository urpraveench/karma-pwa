// TikTym's Cloud Functions (asia-south1, next to the database): the welcome, one-tap-away, first-minute, weekly recap and comeback
// emails, the unsubscribe page, daily push reminders, and voice logging's AI call. What each email says, and who gets it, lives in mail.ts (unit-tested); this file reads,
// sends and records. NOTIFICATIONS.md has the plan.
import { getApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { region as regionV1 } from 'firebase-functions/v1';
import { comebackDue, comebackRange, daysAway, indiaToday, latestLogDate, type MailState } from './comeback.js';
import {
  comebackEmail, confirmUnsubscribePage, easiest, emailOn, FROM, firstName, justStarted, NUDGE_AFTER_MS, nudgeEmail, oneTapCheck, oneTapEmail,
  readUnsubscribe, recapEmail, REPLY_TO, START_AFTER_MS, unsubscribedPage, unsubscribeLink, welcomeEmail, type Email, type Practice,
} from './mail.js';
import { addDays, lastWeekStart, recapCheck, recapFrom, weekRecap, type RecapCategory, type RecapLog, type RecapMail } from './recap.js';
import webpush from 'web-push';
import { reminderCheck, reminderPayload, reminderTarget, sendToDevices, type ReminderDoc } from './push.js';
import { practicesLeft } from './shared/backlog.js';
import { badgeOn, slotAt, VAPID_PUBLIC_KEY } from './shared/reminders.js';
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

async function send(to: string, email: Email, idempotencyKey: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: email.subject, html: email.html, text: email.text, headers: email.headers }),
  });
  if (!res.ok) throw new Error(`Resend said ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
  await send(to.email, email, `welcome-${uid}`);
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
      await send(to!.email, oneTapEmail({ name: to!.name, unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) }), `one-tap-${uid}`);
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
      await send(to.email, nudgeEmail({ name: to.name, practice, unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) }), `nudge-${uid}`);
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
  await send(to.email, email, `recap-${uid}-${week}`);
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
  await send(to.email, email, `comeback-${uid}-${m!.lastLogged}`);
  await mailDoc(uid).set({ comebackFor: m!.lastLogged, comebackAt: Timestamp.now(), lastEmailDay: today }, { merge: true });
  logger.info('comeback sent', { uid, away: daysAway(m!.lastLogged!, today) });
});

const reminderDoc = (uid: string) => db.doc(`reminders/${uid}`);

/** Keeps reminders/{uid} in step with the account's reminder settings and its devices (NOTIF-09). */
async function syncReminder(uid: string) {
  const [settings, devices] = await Promise.all([settingsDoc(uid).get(), db.collection(`users/${uid}/devices`).count().get()]);
  const n = devices.data().count;
  if (!n && !(await reminderDoc(uid).get()).exists) return; // never allowed notifications: nothing to keep
  await reminderDoc(uid).set(reminderTarget(settings.data() as Settings | undefined, n, new Date()), { merge: true });
}

export const reminderSettings = onDocumentWritten({ document: 'users/{uid}/meta/settings' }, event => syncReminder(event.params.uid));
export const reminderDevices = onDocumentWritten({ document: 'users/{uid}/devices/{id}' }, event => syncReminder(event.params.uid));

/**
 * Every 15 minutes: queue a reminder for each account whose chosen time falls in this slot (NOTIF-09). The query reads
 * only those accounts, and the queue sends at a steady rate with retries, so it scales like the comeback.
 */
export const remindersDue = onSchedule({ schedule: '*/15 * * * *', timeZone: 'UTC' }, async () => {
  const slot = slotAt(new Date());
  const due = await db.collection('reminders').where('slot', '==', slot).get();
  const queue = getFunctions().taskQueue('locations/asia-south1/functions/reminderSend');
  await Promise.all(due.docs.map(d => queue.enqueue({ uid: d.id })));
  if (due.size) logger.info('reminders queued', { slot, queued: due.size });
});

/** Sends one account's reminder to each of its devices, if anything is still due today; removes devices that are gone (NOTIF-09 to NOTIF-11). */
export const reminderSend = onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 60 },
  rateLimits: { maxDispatchesPerSecond: 20, maxConcurrentDispatches: 10 },
  secrets: [VAPID_PRIVATE_KEY],
}, async req => {
  const uid = String((req.data as { uid?: unknown })?.uid ?? '');
  if (!uid) return;
  const doc = (await reminderDoc(uid).get()).data() as ReminderDoc | undefined;
  if (!doc?.slot) return;
  const check = reminderCheck(doc, new Date());
  if (check.slot !== doc.slot) await reminderDoc(uid).update({ slot: check.slot }); // daylight saving moved it
  if (check.act !== 'send') return;

  const [settings, cats, months, devices] = await Promise.all([
    settingsDoc(uid).get(), db.collection(`users/${uid}/categories`).get(), db.collection(`users/${uid}/months`).get(), db.collection(`users/${uid}/devices`).get(),
  ]);
  const data: AppData = {
    settings: (settings.data() || {}) as Settings,
    categories: cats.docs.map(d => d.data() as Category),
    logs: months.docs.flatMap(m => Object.values((m.data().entries || {}) as Record<string, Log>)),
  };
  const left = practicesLeft(data, check.date);
  if (!left.length) return; // today is clear, or a rest day
  const payload = reminderPayload(left, badgeOn(data.settings));
  const options = {
    vapidDetails: { subject: 'mailto:hello@tiktym.com', publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY.value() },
    TTL: 3 * 3600, urgency: 'normal' as const, topic: 'daily-reminder',
  };
  const { sent, removed, failed } = await sendToDevices(devices.docs,
    d => { const device = d.data() as PushDevice; return webpush.sendNotification({ endpoint: device.endpoint, keys: device.keys }, payload, options); },
    d => d.ref.delete());
  if (failed) logger.warn('push failed on a device', { uid, error: String(failed) });
  if (sent) await reminderDoc(uid).update({ lastSent: check.date });
  else if (failed) throw failed; // nothing reached: let the queue retry
  logger.info('reminder sent', { uid, devices: sent, removed, left: left.length });
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
