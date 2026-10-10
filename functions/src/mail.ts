// TikTym's emails (NOTIF-03, NOTIF-04, NOTIF-05): content, signed unsubscribe links, and who gets what.
// Pure functions, so they're unit-tested (tests/mail.test.ts); index.ts does the reading, sending and writing.
import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type EmailKind = 'tips' | 'recap' | 'news';
export const EMAIL_KINDS: EmailKind[] = ['tips', 'recap', 'news'];

export const FROM = 'Praveen from TikTym <hello@tiktym.com>';
export const REPLY_TO = 'praveen.cherukuru@gmail.com';
export const APP_URL = 'https://app.tiktym.com/';
export const UNSUBSCRIBE_URL = 'https://app.tiktym.com/unsubscribe';
/** How long after first-run Start the first-minute nudge is due. */
export const NUDGE_AFTER_MS = 24 * 3600_000;

export interface Practice { name: string; minutes: number }
export interface Email { subject: string; html: string; text: string; headers: Record<string, string> }

/** A friendly first name from the display name, or from the email's local part (as the app greets people). */
export function firstName(displayName: string | null | undefined, email: string | null | undefined): string {
  const raw = displayName || (email || '').split('@')[0];
  const w = (raw || '').split(/[\s._\-0-9]+/).filter(Boolean)[0];
  return w && w.length > 1 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}

// --- one-tap unsubscribe (NOTIF-05) ---

const mac = (uid: string, kind: string, secret: string) => createHmac('sha256', secret).update(`${uid}:${kind}`).digest('base64url');

/** A link that turns one email type off for one account, without signing in; the signature stops tampering. */
export function unsubscribeLink(uid: string, kind: EmailKind, secret: string): string {
  return `${UNSUBSCRIBE_URL}?u=${encodeURIComponent(uid)}&k=${kind}&t=${mac(uid, kind, secret)}`;
}

/** The account and email type a link is for, or null if it isn't a link we made. */
export function readUnsubscribe(params: { u?: unknown; k?: unknown; t?: unknown }, secret: string): { uid: string; kind: EmailKind } | null {
  const { u, k, t } = params;
  if (typeof u !== 'string' || typeof t !== 'string' || !EMAIL_KINDS.includes(k as EmailKind) || !u) return null;
  const want = Buffer.from(mac(u, k as string, secret)), got = Buffer.from(t);
  return want.length === got.length && timingSafeEqual(want, got) ? { uid: u, kind: k as EmailKind } : null;
}

// --- who gets what ---

/** An email type is on unless the account turned it off (as Setup shows it). */
export const emailOn = (settings: { emails?: Partial<Record<EmailKind, boolean>> } | undefined, kind: EmailKind) => settings?.emails?.[kind] !== false;

/** First-run Start just happened: the settings went from not seeded to seeded (NOTIF-03). */
export const justStarted = (before: { seeded?: boolean } | undefined, after: { seeded?: boolean } | undefined) => !before?.seeded && !!after?.seeded;

/** The practice to suggest for a first log: the shortest daily target, so starting feels easy (NOTIF-04). */
export const easiest = (ps: Practice[]) => [...ps].sort((a, b) => a.minutes - b.minutes)[0];

// --- the emails ---

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const appLink = (campaign: string) => `${APP_URL}?utm_source=email&utm_medium=email&utm_campaign=${campaign}`;

/** The shared frame: header image, content, button, sign-off, and a footer saying why this came and how to stop it. */
function frame(o: { title: string; paragraphs: string[]; list?: string[]; button: { label: string; href: string }; after?: string[]; why: string; unsubscribe: string }): string {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#16302E;">${t}</p>`;
  const list = o.list?.length ? `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6;color:#16302E;">${o.list.map(i => `<li>${i}</li>`).join('')}</ul>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EDF0EA;padding:24px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#F8FAF6;border:1px solid #CBD5CA;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:0;"><img src="https://tiktym.com/email/header.png" width="600" alt="TikTym · One minute, one point" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
      <tr><td style="padding:28px 32px 8px;font-family:${FONT};color:#16302E;">
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:800;color:#16302E;">${o.title}</h1>
        ${o.paragraphs.map(p).join('\n        ')}
        ${list}
      </td></tr>
      <tr><td align="left" style="padding:0 32px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#16302E" style="border-radius:12px;">
          <a href="${esc(o.button.href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:#EDF0EA;text-decoration:none;border-radius:12px;">${o.button.label}</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:0 32px 24px;font-family:${FONT};">
        ${(o.after || []).map(p).join('\n        ')}
        <p style="margin:0;font-size:16px;line-height:1.55;color:#16302E;">Praveen<br><span style="color:#55685F;font-size:14px;">Founder, TikTym</span></p>
      </td></tr>
      <tr><td style="padding:18px 32px;border-top:1px solid #CBD5CA;font-family:${FONT};font-size:12px;line-height:1.55;color:#55685F;">
        ${o.why} <a href="${esc(o.unsubscribe)}" style="color:#55685F;">Unsubscribe from these emails</a>, or change any email in Setup › Notifications and privacy.<br>
        TikTym · <a href="https://tiktym.com/" style="color:#55685F;">tiktym.com</a> · Pramal IT Services Private Limited · Made in India
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

/** Gmail and Yahoo show their own unsubscribe button from these; One-Click means a POST to the link turns it off. */
const unsubscribeHeaders = (url: string) => ({ 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The welcome, sent once after first-run Start (NOTIF-03). */
export function welcomeEmail(o: { name: string; practices: Practice[]; unsubscribe: string }): Email {
  const hi = o.name ? `Hi ${esc(o.name)},` : 'Hi,';
  const total = o.practices.reduce((s, p) => s + p.minutes, 0);
  const list = o.practices.map(p => `<strong>${esc(p.name)}</strong>: ${p.minutes} min a day`);
  const html = frame({
    title: 'Welcome to TikTym',
    paragraphs: [
      hi,
      `Thanks for starting TikTym. You've set up ${plural(o.practices.length, 'practice')}, ${total} minutes a day in all:`,
    ],
    list,
    button: { label: 'Open TikTym', href: appLink('welcome') },
    after: [
      '<strong>How it works:</strong> every minute you spend is one point. Miss a day and the minutes carry forward, but only up to a limit (two days of each practice, unless you change it in Setup), so a busy week never becomes a mountain. Tap ▶ on a practice for a focus timer that logs the minutes for you.',
      '<strong>Add it to your home screen</strong> so it opens like an app: on iPhone, open it in Safari and tap Share › Add to Home Screen; on Android, tap Install app in Chrome.',
      "I built TikTym because I couldn't find time to learn alongside a full-time job. If anything is confusing, or you'd like something added, just reply to this email. I read every one.",
    ],
    why: "You're getting this because you created a TikTym account.",
    unsubscribe: o.unsubscribe,
  });
  const text = [
    hi.replace(/&amp;/g, '&'), '',
    `Thanks for starting TikTym. You've set up ${plural(o.practices.length, 'practice')}, ${total} minutes a day in all:`,
    ...o.practices.map(p => `- ${p.name}: ${p.minutes} min a day`), '',
    `Open TikTym: ${appLink('welcome')}`, '',
    'How it works: every minute you spend is one point. Miss a day and the minutes carry forward, but only up to a limit (two days of each practice, unless you change it in Setup), so a busy week never becomes a mountain. Tap the play button on a practice for a focus timer that logs the minutes for you.', '',
    'Add it to your home screen so it opens like an app: on iPhone, open it in Safari and tap Share > Add to Home Screen; on Android, tap Install app in Chrome.', '',
    "I built TikTym because I couldn't find time to learn alongside a full-time job. If anything is confusing, or you'd like something added, just reply to this email. I read every one.", '',
    'Praveen', 'Founder, TikTym', '', '--',
    `You're getting this because you created a TikTym account. Unsubscribe: ${o.unsubscribe}`,
  ].join('\n');
  return { subject: o.name ? `Welcome to TikTym, ${o.name}` : 'Welcome to TikTym', html, text, headers: unsubscribeHeaders(o.unsubscribe) };
}

/** The first-minute nudge, once, about a day after Start if nothing is logged (NOTIF-04). */
export function nudgeEmail(o: { name: string; practice: Practice; unsubscribe: string }): Email {
  const hi = o.name ? `Hi ${esc(o.name)},` : 'Hi,';
  const what = esc(o.practice.name);
  const html = frame({
    title: 'Your first five minutes',
    paragraphs: [
      hi,
      `You set up TikTym yesterday, but nothing's logged yet. That's normal: the first entry is the hardest. Start small: <strong>5 minutes of ${what}</strong> today is enough to get going.`,
      'Open TikTym, tap ▶ on the practice, and the timer logs the minutes for you.',
    ],
    button: { label: `Start 5 minutes of ${what}`, href: appLink('first_minute') },
    after: ["If something got in the way, reply and tell me. It helps me make TikTym easier."],
    why: "You're getting this because you created a TikTym account and haven't logged anything yet.",
    unsubscribe: o.unsubscribe,
  });
  const text = [
    hi.replace(/&amp;/g, '&'), '',
    `You set up TikTym yesterday, but nothing's logged yet. That's normal: the first entry is the hardest. Start small: 5 minutes of ${o.practice.name} today is enough to get going.`, '',
    'Open TikTym, tap the play button on the practice, and the timer logs the minutes for you.', '',
    `Open TikTym: ${appLink('first_minute')}`, '',
    'If something got in the way, reply and tell me. It helps me make TikTym easier.', '',
    'Praveen', 'Founder, TikTym', '', '--',
    `You're getting this because you created a TikTym account and haven't logged anything yet. Unsubscribe: ${o.unsubscribe}`,
  ].join('\n');
  return { subject: 'Your first five minutes on TikTym', html, text, headers: unsubscribeHeaders(o.unsubscribe) };
}

const KIND_NAME: Record<EmailKind, string> = { tips: 'welcome and first-week tips', recap: 'weekly recap', news: 'news' };

function page(body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>TikTym emails</title>
<style>body{margin:0;background:#EDF0EA;color:#16302E;font:16px/1.55 ${FONT};display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}main{max-width:440px;background:#F8FAF6;border:1px solid #CBD5CA;border-radius:16px;padding:28px}h1{margin:0 0 10px;font-size:24px}p{margin:0 0 16px}a{color:#16302E;font-weight:700}button{font:inherit;font-weight:700;padding:12px 24px;border:0;border-radius:12px;background:#16302E;color:#EDF0EA;cursor:pointer}</style></head>
<body><main>${body}</main></body></html>`;
}

/**
 * Opening the link shows a button rather than unsubscribing at once: email scanners open every link in a message,
 * and would otherwise unsubscribe people who never clicked. Gmail's own button posts directly (NOTIF-05).
 */
export function confirmUnsubscribePage(kind: EmailKind, action: string): string {
  return page(`<h1>Unsubscribe?</h1><p>You'll stop getting TikTym ${KIND_NAME[kind]} emails. You can turn them back on any time in Setup › Notifications and privacy.</p>
<form method="post" action="${esc(action)}"><button type="submit">Unsubscribe</button></form>`);
}

/** The page shown after unsubscribing, or when a link isn't valid (NOTIF-05). */
export function unsubscribedPage(kind: EmailKind | null): string {
  return page(kind
    ? `<h1>You're unsubscribed</h1><p>You won't get TikTym ${KIND_NAME[kind]} emails any more. Changed your mind? Turn them back on in Setup › Notifications and privacy.</p><p><a href="${APP_URL}">Open TikTym</a></p>`
    : `<h1>That link didn't work</h1><p>It may be incomplete. You can turn any email off in Setup › Notifications and privacy.</p><p><a href="${APP_URL}">Open TikTym</a></p>`);
}
