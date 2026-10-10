import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { confirmUnsubscribePage, easiest, emailOn, firstName, justStarted, nudgeEmail, oneTapCheck, oneTapEmail, readUnsubscribe, START_AFTER_MS, unsubscribedPage, unsubscribeLink, welcomeEmail } from '../functions/src/mail';

const SECRET = 'test-secret';
const practices = [{ name: 'Exercise', minutes: 30 }, { name: 'Reading', minutes: 30 }, { name: 'Meditation', minutes: 10 }];

describe('one-tap unsubscribe (NOTIF-05)', () => {
  it('a link we made turns one email type off for one account', () => {
    const url = new URL(unsubscribeLink('uid123', 'tips', SECRET));
    expect(url.origin + url.pathname).toBe('https://app.tiktym.com/unsubscribe');
    expect(readUnsubscribe(Object.fromEntries(url.searchParams), SECRET)).toEqual({ uid: 'uid123', kind: 'tips' });
  });

  it('a tampered, incomplete or foreign link does nothing', () => {
    const p = Object.fromEntries(new URL(unsubscribeLink('uid123', 'tips', SECRET)).searchParams);
    expect(readUnsubscribe({ ...p, u: 'someone-else' }, SECRET)).toBeNull();
    expect(readUnsubscribe({ ...p, k: 'news' }, SECRET)).toBeNull();
    expect(readUnsubscribe({ ...p, k: 'everything' }, SECRET)).toBeNull();
    expect(readUnsubscribe({ u: p.u, k: p.k }, SECRET)).toBeNull();
    expect(readUnsubscribe(p, 'another-secret')).toBeNull();
  });
});

describe('who gets what (NOTIF-03, NOTIF-04)', () => {
  it('an email type is on unless turned off', () => {
    expect(emailOn(undefined, 'tips')).toBe(true);
    expect(emailOn({ emails: { recap: false } }, 'tips')).toBe(true);
    expect(emailOn({ emails: { tips: false } }, 'tips')).toBe(false);
  });

  it('the welcome is for the moment first-run Start happens, not later writes', () => {
    expect(justStarted(undefined, { seeded: true })).toBe(true);
    expect(justStarted({ seeded: false }, { seeded: true })).toBe(true);
    expect(justStarted({ seeded: true }, { seeded: true })).toBe(false); // e.g. changing the backlog limit
    expect(justStarted({}, {})).toBe(false); // the first load, before Start
  });

  it('suggests the shortest practice for a first log', () => {
    expect(easiest(practices)!.name).toBe('Meditation');
  });

  it('greets by first name, from the display name or the email', () => {
    expect(firstName('Asha Kumar', 'x@y.z')).toBe('Asha');
    expect(firstName(null, 'ravi.k@example.com')).toBe('Ravi');
    expect(firstName(null, 'r@example.com')).toBe('');
  });
});

describe('the emails (NOTIF-03, NOTIF-04)', () => {
  const unsubscribe = unsubscribeLink('uid123', 'tips', SECRET);

  it('the welcome greets by name and lists the chosen practices, in their colours, with the daily total', () => {
    const e = welcomeEmail({ name: 'Asha', practices: practices.map((p, i) => ({ ...p, color: ['#1F8A70', '#3E5BA9', '#8A4FA3'][i] })), unsubscribe });
    expect(e.subject).toBe('Welcome to TikTym, Asha');
    for (const s of ['Welcome to TikTym, Asha', '3 practices in all:', '>Meditation</td>', '10 min a day', 'background:#8A4FA3', '70 minutes a day', 'Every minute counts towards your 70.', 'Busy days carry forward.', 'Add it to your home screen', 'reply to this email', 'https://app.tiktym.com/?utm_source=email', "family=Bricolage+Grotesque"])
      expect(e.html).toContain(s);
    expect(e.text).toContain('- Exercise: 30 min a day');
    expect(e.text).toContain(`Unsubscribe: ${unsubscribe}`);
  });

  it('every email carries the unsubscribe link, in the footer and the headers Gmail uses', () => {
    for (const e of [welcomeEmail({ name: '', practices, unsubscribe }), nudgeEmail({ name: '', practice: practices[2], unsubscribe })]) {
      expect(e.html).toContain(unsubscribe.replace(/&/g, '&amp;'));
      expect(e.headers).toEqual({ 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    }
  });

  it('signs off as Praveen, helping people, with no title or company name', () => {
    for (const e of [welcomeEmail({ name: 'Asha', practices, unsubscribe }), nudgeEmail({ name: 'Asha', practice: practices[2], unsubscribe })]) {
      for (const part of [e.html, e.text]) {
        expect(part).toContain('Helping busy people like you make time for what matters.');
        expect(part).not.toMatch(/Founder|Pramal/);
      }
    }
  });

  it('the nudge suggests five minutes of the shortest practice', () => {
    const e = nudgeEmail({ name: 'Ravi', practice: practices[2], unsubscribe });
    expect(e.subject).toBe('Your first five minutes on TikTym');
    expect(e.html).toContain('<strong>5 minutes of Meditation</strong>');
    expect(e.html).toContain('Start 5 minutes of Meditation');
    expect(e.html).toContain('5 min today'); // not "a day": the target itself doesn't change
    expect(e.html).not.toContain('minutes a day</strong>'); // the nudge shows no daily total
  });

  it('escapes names and practice names, and only uses real colours', () => {
    const e = welcomeEmail({ name: '<b>', practices: [{ name: 'Guitar & <script>', minutes: 20, color: 'red;background:url(x)' }], unsubscribe });
    expect(e.html).not.toContain('url(x)');
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('Guitar &amp; &lt;script&gt;');
  });

  it('opening the link asks first, with a button that posts, so email scanners can\'t unsubscribe anyone', () => {
    const html = confirmUnsubscribePage('tips', '/unsubscribe?u=a&k=tips&t=x');
    expect(html).toContain("You'll stop getting TikTym tips and reminders emails");
    expect(html).toContain('<form method="post" action="/unsubscribe?u=a&amp;k=tips&amp;t=x">');
  });

  it('the unsubscribed page confirms, or says the link failed', () => {
    expect(unsubscribedPage('recap')).toContain("You won't get TikTym weekly and monthly recap emails any more");
    expect(unsubscribedPage(null)).toContain("That link didn't work");
  });
});

describe('"one tap away" for accounts that never tapped Start (NOTIF-15)', () => {
  const unsubscribe = unsubscribeLink('uid123', 'tips', SECRET);

  it('goes about a day after signing in, only if still not started, tips are on and there is an address', () => {
    expect(START_AFTER_MS).toBe(24 * 3600_000);
    expect(oneTapCheck(undefined, true)).toBe('send'); // signed in, never got as far as saving any settings
    expect(oneTapCheck({ seeded: false }, true)).toBe('send');
    expect(oneTapCheck({ seeded: true }, true)).toBe('started'); // tapped Start since: the welcome took over
    expect(oneTapCheck({ emails: { tips: false } }, true)).toBe('off');
    expect(oneTapCheck({ emails: { recap: false } }, true)).toBe('send');
    expect(oneTapCheck(undefined, false)).toBe('no-recipient');
  });

  it('says picking practices takes under a minute, 100 minutes only suggested, with a button to the app', () => {
    const e = oneTapEmail({ name: 'Meera', unsubscribe });
    expect(e.subject).toBe('Your TikTym is one tap away');
    for (const s of ['Hi Meera,', 'One tap away', 'It takes under a minute', 'Exercise, Reading, Course study, Meditation, or add your own', '100 minutes a day is the suggested start, not a rule', 'Pick my practices', 'utm_campaign=one_tap', "haven't finished setting it up"])
      expect(e.html).toContain(s);
    expect(e.text).toContain('Pick my practices: https://app.tiktym.com/?utm_source=email&utm_medium=email&utm_campaign=one_tap');
    expect(e.text).not.toContain('▶');
    expect(e.headers['List-Unsubscribe']).toBe(`<${unsubscribe}>`);
    for (const part of [e.html, e.text]) {
      expect(part).toContain('Helping busy people like you make time for what matters.');
      expect(part).not.toMatch(/Founder|Pramal/);
    }
    expect(oneTapEmail({ name: '', unsubscribe }).text.startsWith('Hi,\n')).toBe(true);
  });

  it("is set up for every new account, and the welcome no longer needs mail/{uid} to be new", () => {
    const src = readFileSync('functions/src/index.ts', 'utf8');
    expect(src).toMatch(/regionV1\('asia-south1'\)\.auth\.user\(\)\.onCreate/);
    expect(src).toContain('startDueAt: Timestamp.fromMillis(now + START_AFTER_MS)');
    expect(src).not.toContain('mailDoc(uid).create(');
    expect(src).toContain("startDueAt: FieldValue.delete() }, { merge: true }"); // Start cancels it
  });
});
