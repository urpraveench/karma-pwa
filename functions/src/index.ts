// TikTym's Cloud Functions (asia-south1, next to the database): the welcome and first-minute emails, and the
// unsubscribe page. What each email says, and who gets it, lives in mail.ts (unit-tested); this file reads,
// sends and records. NOTIFICATIONS.md has the plan.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  confirmUnsubscribePage, easiest, emailOn, FROM, firstName, justStarted, NUDGE_AFTER_MS, nudgeEmail, readUnsubscribe,
  REPLY_TO, unsubscribedPage, unsubscribeLink, welcomeEmail, type Email, type Practice,
} from './mail.js';

setGlobalOptions({ region: 'asia-south1', maxInstances: 3 });
initializeApp();
const db = getFirestore();

/** Resend's API key (Sending access, tiktym.com): set with `firebase functions:secrets:set RESEND_API_KEY`. */
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
/** Signs unsubscribe links, so nobody can unsubscribe someone else. */
const UNSUBSCRIBE_SECRET = defineSecret('UNSUBSCRIBE_SECRET');

/**
 * Server-only record per account, mail/{uid} (apps can't read or write it): when first-run Start happened, when the
 * welcome went, and when the first-minute nudge is due (removed once handled).
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
    .map(c => ({ name: String(c.name), minutes: Number(c.targets?.[c.targets.length - 1]?.minutes ?? 0) }));
}

async function recipient(uid: string): Promise<{ email: string; name: string } | null> {
  const u = await getAuth().getUser(uid).catch(() => null);
  return u?.email ? { email: u.email, name: firstName(u.displayName, u.email) } : null;
}

/** First-run Start: send the welcome (if tips are on), and set the first-minute nudge for about a day later (NOTIF-03). */
export const welcome = onDocumentWritten({ document: 'users/{uid}/meta/settings', secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET] }, async event => {
  const uid = event.params.uid;
  if (!justStarted(event.data?.before.data(), event.data?.after.data())) return;
  const startedAt = Timestamp.now();
  try {
    await mailDoc(uid).create({ startedAt, nudgeDueAt: Timestamp.fromMillis(startedAt.toMillis() + NUDGE_AFTER_MS) });
  } catch {
    return; // already recorded: the welcome goes once per account, even if Start is somehow saved twice
  }
  if (!emailOn(event.data?.after.data(), 'tips')) return;
  const to = await recipient(uid);
  if (!to) return;
  const email = welcomeEmail({ name: to.name, practices: await practices(uid), unsubscribe: unsubscribeLink(uid, 'tips', UNSUBSCRIBE_SECRET.value()) });
  await send(to.email, email, `welcome-${uid}`);
  await mailDoc(uid).update({ welcomeAt: Timestamp.now() });
  logger.info('welcome sent', { uid });
});

/** Every hour: the first-minute nudge for accounts a day past Start with nothing logged (NOTIF-04). */
export const firstMinute = onSchedule({ schedule: 'every 60 minutes', timeZone: 'Asia/Kolkata', secrets: [RESEND_API_KEY, UNSUBSCRIBE_SECRET] }, async () => {
  const due = await db.collection('mail').where('nudgeDueAt', '<=', Timestamp.now()).limit(100).get();
  for (const doc of due.docs) {
    const uid = doc.id;
    const handled = (outcome: string) => doc.ref.update({ nudgeDueAt: FieldValue.delete(), nudge: outcome, nudgeAt: Timestamp.now() });
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
