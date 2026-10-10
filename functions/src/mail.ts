// TikTym's emails (NOTIF-03 to NOTIF-06): content, signed unsubscribe links, and who gets what.
// Pure functions, so they're unit-tested (tests/mail.test.ts); index.ts does the reading, sending and writing.
import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { suggestion, type Recap } from './recap.js';

export type EmailKind = 'tips' | 'recap' | 'news';
export const EMAIL_KINDS: EmailKind[] = ['tips', 'recap', 'news'];

export const FROM = 'Praveen from TikTym <hello@tiktym.com>';
export const REPLY_TO = 'praveen.cherukuru@gmail.com';
/** Under Praveen's name: about the reader, not a job title (no company name or "Founder" tag in emails). */
export const SIGN_OFF = 'Helping busy people like you make time for what matters.';
export const APP_URL = 'https://app.tiktym.com/';
export const UNSUBSCRIBE_URL = 'https://app.tiktym.com/unsubscribe';
/** How long after first-run Start the first-minute nudge is due. */
export const NUDGE_AFTER_MS = 24 * 3600_000;

/** A practice as the emails show it; colour is the practice's colour in the app. */
export interface Practice { name: string; minutes: number; color?: string }
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
// In TikTym's look: the brand colours, the header with the mala, Bricolage Grotesque for headings where the email app
// supports web fonts (Apple Mail; others fall back to a bold system font), practice colour dots and gold accents.

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = `'Bricolage Grotesque',${FONT}`;
const INK = '#16302E', INK2 = '#55685F', LINE = '#CBD5CA', SURFACE = '#F8FAF6', BG = '#EDF0EA', GOLD = '#A0740A';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const appLink = (campaign: string) => `${APP_URL}?utm_source=email&utm_medium=email&utm_campaign=${campaign}`;
const safeColor = (c: string | undefined) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : INK);

const para = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK};">${t}</p>`;

/** The practices as the app shows them: colour dot, name, daily minutes; and the daily total in gold. */
function practicesCard(ps: Practice[], per = 'a day'): string {
  const total = ps.reduce((s, p) => s + p.minutes, 0);
  const rows = ps.map(p => `<tr>
          <td width="22" style="padding:10px 0 10px 16px;"><span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:${safeColor(p.color)};"></span></td>
          <td style="padding:10px 8px;font-size:16px;font-weight:700;color:${INK};">${esc(p.name)}</td>
          <td align="right" style="padding:10px 16px 10px 8px;font-size:15px;color:${INK2};white-space:nowrap;">${p.minutes} min ${per}</td>
        </tr>`).join(`\n        <tr><td colspan="3" style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</td></tr>\n        `);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;background:${BG};border:1px solid ${LINE};border-radius:12px;font-family:${FONT};">
        ${rows}
      </table>
      <p style="margin:0 0 22px;font-size:14px;color:${INK2};font-family:${FONT};"><strong style="color:${GOLD};">${total} minutes a day</strong> · your productive life</p>`;
}

/** Short tips with gold numbers, in TikTym's voice. */
function tips(items: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;font-family:${FONT};">
        ${items.map(([lead, rest], n) => `<tr>
          <td width="34" valign="top" style="padding:0 0 14px;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:12px;background:${GOLD};color:#FFFFFF;font-size:13px;font-weight:800;text-align:center;">${n + 1}</span></td>
          <td valign="top" style="padding:2px 0 14px;font-size:16px;line-height:1.5;color:${INK};"><strong>${lead}</strong> ${rest}</td>
        </tr>`).join('\n        ')}
      </table>`;
}

const button = (label: string, href: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px;"><tr><td align="center" bgcolor="${INK}" style="border-radius:12px;">
          <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${BG};text-decoration:none;border-radius:12px;">${label}</a>
        </td></tr></table>`;

/** The shared frame: a full document (so web-font-capable apps load the brand font), header, content, sign-off, footer. */
function frame(o: { title: string; body: string[]; why: string; unsubscribe: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap" rel="stylesheet">
<title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:24px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${SURFACE};border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
      <tr><td style="padding:0;"><img src="https://tiktym.com/email/header.png" width="600" alt="TikTym · 100 minutes a day" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
      <tr><td style="padding:28px 32px 8px;font-family:${FONT};color:${INK};">
        <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-0.02em;color:${INK};">${o.title}</h1>
        ${o.body.join('\n        ')}
        <p style="margin:8px 0 24px;font-size:16px;line-height:1.5;color:${INK};">Praveen<br><span style="color:${INK2};font-size:14px;font-style:italic;">${SIGN_OFF}</span></p>
      </td></tr>
      <tr><td style="padding:18px 32px;border-top:1px solid ${LINE};font-family:${FONT};font-size:12px;line-height:1.55;color:${INK2};">
        ${o.why} <a href="${esc(o.unsubscribe)}" style="color:${INK2};">Unsubscribe from these emails</a>, or change any email in Setup › Notifications and privacy.<br>
        TikTym · <a href="https://tiktym.com/" style="color:${INK2};">tiktym.com</a> · Made in India
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Gmail and Yahoo show their own unsubscribe button from these; One-Click means a POST to the link turns it off. */
const unsubscribeHeaders = (url: string) => ({ 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The welcome's three tips; the first uses the person's own daily total (100 is only the suggested start). */
const welcomeTips = (total: number): [string, string][] => [
  [`Every minute counts towards your ${total}.`, 'Ten minutes on a hectic day still counts.'],
  ['Busy days carry forward.', 'Missed minutes move to the next day, up to two days of each practice (change it in Setup), so a bad week never becomes a mountain.'],
  ['Tap ▶ for a focus timer.', 'It logs the minutes for you when you stop.'],
];

/** The welcome, sent once after first-run Start (NOTIF-03). */
export function welcomeEmail(o: { name: string; practices: Practice[]; unsubscribe: string }): Email {
  const hi = o.name ? `Hi ${esc(o.name)},` : 'Hi,';
  const total = o.practices.reduce((s, p) => s + p.minutes, 0);
  const html = frame({
    title: o.name ? `Welcome to TikTym, ${esc(o.name)}` : 'Welcome to TikTym',
    body: [
      para(`Thanks for starting TikTym. Here's what you're making time for, ${plural(o.practices.length, 'practice')} in all:`),
      practicesCard(o.practices),
      tips(welcomeTips(total)),
      button('Open TikTym', appLink('welcome')),
      para('<strong>Add it to your home screen</strong> so it opens like an app: on iPhone, open it in Safari and tap Share › Add to Home Screen; on Android, tap Install app in Chrome.'),
      para("I built TikTym because I couldn't find time to learn alongside a full-time job. If anything is confusing, or you'd like something added, just reply to this email. I read every one."),
    ],
    why: "You're getting this because you created a TikTym account.",
    unsubscribe: o.unsubscribe,
  });
  const text = [
    hi.replace(/&amp;/g, '&'), '',
    `Thanks for starting TikTym. Here's what you're making time for, ${plural(o.practices.length, 'practice')} in all:`,
    ...o.practices.map(p => `- ${p.name}: ${p.minutes} min a day`),
    `${total} minutes a day: your productive life.`, '',
    ...welcomeTips(total).map(([lead, rest], n) => `${n + 1}. ${lead} ${rest.replace('▶', 'the play button')}`), '',
    `Open TikTym: ${appLink('welcome')}`, '',
    'Add it to your home screen so it opens like an app: on iPhone, open it in Safari and tap Share > Add to Home Screen; on Android, tap Install app in Chrome.', '',
    "I built TikTym because I couldn't find time to learn alongside a full-time job. If anything is confusing, or you'd like something added, just reply to this email. I read every one.", '',
    'Praveen', SIGN_OFF, '', '--',
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
    body: [
      para(hi),
      para(`You set up TikTym yesterday, but nothing's logged yet. That's normal: the first entry is the hardest. Start small: <strong>5 minutes of ${what}</strong> today is enough to get going.`),
      practicesCard([{ ...o.practice, minutes: 5 }], 'today').replace(/<p style[^>]*>.*?<\/p>/s, ''),
      para('Open TikTym, tap ▶ on the practice, and the timer logs the minutes for you.'),
      button(`Start 5 minutes of ${what}`, appLink('first_minute')),
      para('If something got in the way, reply and tell me. It helps me make TikTym easier.'),
    ],
    why: "You're getting this because you created a TikTym account and haven't logged anything yet.",
    unsubscribe: o.unsubscribe,
  });
  const text = [
    hi.replace(/&amp;/g, '&'), '',
    `You set up TikTym yesterday, but nothing's logged yet. That's normal: the first entry is the hardest. Start small: 5 minutes of ${o.practice.name} today is enough to get going.`, '',
    'Open TikTym, tap the play button on the practice, and the timer logs the minutes for you.', '',
    `Open TikTym: ${appLink('first_minute')}`, '',
    'If something got in the way, reply and tell me. It helps me make TikTym easier.', '',
    'Praveen', SIGN_OFF, '', '--',
    `You're getting this because you created a TikTym account and haven't logged anything yet. Unsubscribe: ${o.unsubscribe}`,
  ].join('\n');
  return { subject: 'Your first five minutes on TikTym', html, text, headers: unsubscribeHeaders(o.unsubscribe) };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayMonth = (d: string) => [Number(d.slice(8, 10)), MONTHS[Number(d.slice(5, 7)) - 1]] as const;
const weekdayOf = (d: string) => WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()];

/** "5 to 11 October", or "28 September to 4 October" across a month end. */
export function weekLabel(start: string, end: string): string {
  const [d1, m1] = dayMonth(start), [d2, m2] = dayMonth(end);
  return m1 === m2 ? `${d1} to ${d2} ${m2}` : `${d1} ${m1} to ${d2} ${m2}`;
}

/** The week's three numbers, side by side. */
function statsRow(cells: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;background:${BG};border:1px solid ${LINE};border-radius:12px;font-family:${FONT};"><tr>
          ${cells.map(([big, small], i) => `<td width="${Math.floor(100 / cells.length)}%" align="center" valign="top" style="padding:16px 6px;${i ? `border-left:1px solid ${LINE};` : ''}">
            <div style="font-family:${DISPLAY};font-size:24px;line-height:1.1;font-weight:800;color:${INK};">${big}</div>
            <div style="margin-top:4px;font-size:13px;line-height:1.35;color:${INK2};">${small}</div>
          </td>`).join('\n          ')}
        </tr></table>`;
}

/** Each practice with its colour, minutes against its target, and a bar (full once the target is met). */
function practiceBars(r: Recap): string {
  const rows = r.practices.map(p => {
    const pct = p.target ? Math.min(100, Math.round((p.done / p.target) * 100)) : 100;
    const bar = pct > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${LINE};border-radius:4px;"><tr><td width="${pct}%" style="height:8px;font-size:0;line-height:0;background:${safeColor(p.color)};border-radius:4px;">&nbsp;</td>${pct < 100 ? '<td style="font-size:0;line-height:0;">&nbsp;</td>' : ''}</tr></table>`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${LINE};border-radius:4px;"><tr><td style="height:8px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
    const of = p.target ? `${p.done} of ${p.target} min` : `${p.done} min`;
    return `<tr><td style="padding:12px 16px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="20"><span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:${safeColor(p.color)};"></span></td>
              <td style="font-size:16px;font-weight:700;color:${INK};">${esc(p.name)}</td>
              <td align="right" style="font-size:15px;color:${INK2};white-space:nowrap;">${p.target && p.done >= p.target ? `<strong style="color:${GOLD};">✓</strong> ` : ''}${of}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:4px 16px 12px;">${bar}</td></tr>`;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;background:${BG};border:1px solid ${LINE};border-radius:12px;font-family:${FONT};">
          ${rows.join(`\n          <tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</td></tr>\n          `)}
        </table>`;
}

/** The suggestion, set apart with a gold edge. */
const callout = (t: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;font-family:${FONT};"><tr>
          <td width="4" style="background:${GOLD};border-radius:2px;font-size:0;">&nbsp;</td>
          <td style="padding:4px 0 4px 14px;font-size:16px;line-height:1.55;color:${INK};">${t}</td>
        </tr></table>`;

/** How the week compares with the one before: good news is said, a lighter week is never a telling-off. */
function compared(r: Recap): string {
  if (r.prev === null || r.prev === 0) return '';
  const diff = r.done - r.prev;
  if (diff > 0) return `That's ${diff} minutes more than the week before.`;
  if (diff === 0) return 'The same as the week before: steady.';
  return 'A lighter week than the one before, and that\'s fine. Every minute counts.';
}

/** The suggestion's words; plain text, with **bold** marked for the HTML. */
function suggestionText(r: Recap, easiest?: string): string {
  const s = suggestion(r);
  if (s.kind === 'all-met') return 'You met every target last week. **Keep the same rhythm this week**; if one feels easy, you can raise it in Setup.';
  if (s.kind === 'lowest') {
    const p = s.practice!;
    return p.done === 0
      ? `**${p.name}** didn't get any time last week. **Try 10 minutes of it early this week**, while the week is fresh. Every minute counts.`
      : `**${p.name}** got ${p.done} of ${p.target} minutes. **Try a short session of it early this week**, while the week is fresh. Every minute counts.`;
  }
  return `Last week was quiet, and that's okay. **You don't need to make up for it**: just start with **5 minutes${easiest ? ` of ${easiest}` : ''} today**.`;
}

const bold = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/** The weekly recap, Mondays at 8 am India time, for anyone active in the last two weeks (NOTIF-06). */
export function recapEmail(o: { name: string; recap: Recap; easiest?: string; unsubscribe: string }): Email {
  const r = o.recap, quiet = r.done === 0, when = weekLabel(r.start, r.end);
  const hi = o.name ? `Hi ${esc(o.name)},` : 'Hi,';
  const tip = suggestionText(r, o.easiest);
  const streak = r.streak >= 2 ? `You've shown up ${r.streak} days in a row. Log something today to keep it going.` : '';
  const vs = compared(r);
  const best = r.best ? [`${r.best.minutes} min`, `best day, ${weekdayOf(r.best.date)}`] as [string, string] : ['–', 'best day'] as [string, string];
  const title = quiet ? 'A fresh week' : o.name ? `Your week, ${esc(o.name)}` : 'Your week';
  const html = frame({
    title,
    body: quiet ? [
      para(hi),
      callout(bold(tip)),
      button(`Start 5 minutes${o.easiest ? ` of ${esc(o.easiest)}` : ''}`, appLink('weekly_recap')),
      para('If something got in the way, reply and tell me. It helps me make TikTym easier.'),
    ] : [
      para(`Here's how ${when} went.`),
      statsRow([
        [`${r.done}`, r.target ? `minutes, of ${r.target} planned` : 'minutes logged'],
        [`${r.daysShown} of ${r.days}`, 'days you showed up'],
        best,
      ]),
      practiceBars(r),
      ...(vs || streak ? [para([vs, streak].filter(Boolean).join(' '))] : []),
      callout(bold(tip)),
      button('Open TikTym', appLink('weekly_recap')),
      para('Reply and tell me what helped this week, or what got in the way. I read every one.'),
    ],
    why: "You're getting this because Weekly recap is on in your TikTym account.",
    unsubscribe: o.unsubscribe,
  });
  const plain = (t: string) => t.replace(/\*\*/g, '');
  const text = [
    hi.replace(/&amp;/g, '&'), '',
    ...(quiet ? [plain(tip)] : [
      `Here's your week on TikTym, ${when}.`, '',
      `${r.done} minutes${r.target ? ` of ${r.target} planned` : ''} · ${r.daysShown} of ${r.days} days you showed up${r.best ? ` · best day ${weekdayOf(r.best.date)}, ${r.best.minutes} min` : ''}`, '',
      ...r.practices.map(p => `- ${p.name}: ${p.target ? `${p.done} of ${p.target} min` : `${p.done} min`}`), '',
      ...(vs || streak ? [[vs, streak].filter(Boolean).join(' '), ''] : []),
      plain(tip),
    ]), '',
    `Open TikTym: ${appLink('weekly_recap')}`, '',
    'Praveen', SIGN_OFF, '', '--',
    `You're getting this because Weekly recap is on in your TikTym account. Unsubscribe: ${o.unsubscribe}`,
  ].join('\n');
  const subject = quiet ? 'A fresh week on TikTym' : `Your week on TikTym: ${r.done} minutes`;
  return { subject, html, text, headers: unsubscribeHeaders(o.unsubscribe) };
}

/** The pages shown by the unsubscribe link (NOTIF-05). */
const KIND_NAME: Record<EmailKind, string> = { tips: 'tips and reminders', recap: 'weekly and monthly recap', news: 'news' };

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
