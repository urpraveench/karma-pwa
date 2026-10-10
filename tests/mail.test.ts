import { describe, expect, it } from 'vitest';
import { easiest, emailOn, firstName, justStarted, nudgeEmail, readUnsubscribe, unsubscribedPage, unsubscribeLink, welcomeEmail } from '../functions/src/mail';

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

  it('the welcome greets by name and lists the chosen practices and daily total', () => {
    const e = welcomeEmail({ name: 'Asha', practices, unsubscribe });
    expect(e.subject).toBe('Welcome to TikTym, Asha');
    for (const s of ['Hi Asha,', '3 practices, 70 minutes a day', '<strong>Meditation</strong>: 10 min a day', 'Add it to your home screen', 'reply to this email', 'https://app.tiktym.com/?utm_source=email'])
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

  it('the nudge suggests five minutes of the shortest practice', () => {
    const e = nudgeEmail({ name: 'Ravi', practice: practices[2], unsubscribe });
    expect(e.subject).toBe('Your first five minutes on TikTym');
    expect(e.html).toContain('<strong>5 minutes of Meditation</strong>');
    expect(e.html).toContain('Start 5 minutes of Meditation');
  });

  it('escapes names and practice names', () => {
    const e = welcomeEmail({ name: '<b>', practices: [{ name: 'Guitar & <script>', minutes: 20 }], unsubscribe });
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('Guitar &amp; &lt;script&gt;');
  });

  it('the unsubscribed page confirms, or says the link failed', () => {
    expect(unsubscribedPage('recap')).toContain("You won't get TikTym weekly recap emails any more");
    expect(unsubscribedPage(null)).toContain("That link didn't work");
  });
});
