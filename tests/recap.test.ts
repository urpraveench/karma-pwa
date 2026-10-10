import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { lastWeekStart, recapCheck, recapFrom, suggestion, weekRecap, type RecapCategory, type RecapLog } from '../functions/src/recap';
import { recapEmail, unsubscribeLink, weekLabel } from '../functions/src/mail';

const ALL = [0, 1, 2, 3, 4, 5, 6];
const cat = (id: string, name: string, minutes: number, o: Partial<RecapCategory> = {}): RecapCategory =>
  ({ id, name, color: '#1F8A70', order: 0, startDate: '2026-09-01', targets: [{ from: '2026-09-01', minutes, days: ALL }], ...o });
const L = (catId: string, date: string, minutes: number): RecapLog => ({ catId, date, minutes });
const WEEK = '2026-10-05'; // Monday 5 to Sunday 11 October

describe('which week (NOTIF-06)', () => {
  it('on Monday 8 am India time, the recap covers the Monday to Sunday just finished', () => {
    expect(lastWeekStart(new Date('2026-10-12T02:30:00Z'))).toBe('2026-10-05'); // Mon 12 Oct, 8:00 IST
    expect(lastWeekStart(new Date('2026-10-11T19:00:00Z'))).toBe('2026-10-05'); // already Monday 00:30 in India
    expect(lastWeekStart(new Date('2026-10-18T10:00:00Z'))).toBe('2026-10-05'); // a retry later in that week
  });

  it('names the week, across a month end too', () => {
    expect(weekLabel('2026-10-05', '2026-10-11')).toBe('5 to 11 October');
    expect(weekLabel('2026-09-28', '2026-10-04')).toBe('28 September to 4 October');
  });
});

describe('the week in numbers (NOTIF-06)', () => {
  const cats = [
    cat('e', 'Exercise', 30),
    cat('u', 'Upskilling', 30, { order: 1, targets: [{ from: '2026-09-01', minutes: 30, days: [1, 2, 3, 4, 5] }] }),
  ];

  it('adds up minutes against the targets, days shown up, best day and the streak to Sunday', () => {
    const logs = [L('e', '2026-10-05', 30), L('e', '2026-10-07', 20), L('u', '2026-10-07', 45), L('e', '2026-10-10', 30), L('e', '2026-10-11', 30), L('e', '2026-09-30', 15)];
    const r = weekRecap(cats, logs, WEEK)!;
    expect(r).toMatchObject({ start: '2026-10-05', end: '2026-10-11', done: 155, target: 210 + 150, prev: 15, daysShown: 4, days: 7, streak: 2 });
    expect(r.best).toEqual({ date: '2026-10-07', minutes: 65 });
    expect(r.practices.map(p => [p.name, p.done, p.target])).toEqual([['Exercise', 110, 210], ['Upskilling', 45, 150]]);
  });

  it('nobody active in the last two weeks gets no recap', () => {
    expect(weekRecap(cats, [L('e', '2026-09-27', 30)], WEEK)).toBeNull();
    expect(weekRecap(cats, [], WEEK)).toBeNull();
    expect(weekRecap(cats, [L('e', '2026-10-06', 0)], WEEK)).toBeNull(); // a zero entry isn't activity
  });

  it('active the week before but not last week: a quiet week', () => {
    const r = weekRecap(cats, [L('e', '2026-09-29', 30)], WEEK)!;
    expect(r.done).toBe(0);
    expect(suggestion(r).kind).toBe('quiet');
  });

  it('a new account counts from its start, with no week before to compare', () => {
    const fresh = [cat('e', 'Exercise', 30, { startDate: '2026-10-08', targets: [{ from: '2026-10-08', minutes: 30, days: ALL }] })];
    const r = weekRecap(fresh, [L('e', '2026-10-08', 30), L('e', '2026-10-09', 30)], WEEK)!;
    expect(r).toMatchObject({ target: 120, days: 4, prev: null });
  });

  it('a practice archived mid-week counts until then; one with no time and no target is left out', () => {
    const r = weekRecap([cat('e', 'Exercise', 30), cat('g', 'Guitar', 20, { archivedFrom: '2026-10-07' }), cat('o', 'Old', 20, { archivedFrom: '2026-09-15' })], [L('e', '2026-10-05', 30)], WEEK)!;
    expect(r.practices.map(p => [p.name, p.target])).toEqual([['Exercise', 210], ['Guitar', 40]]);
  });

  it('suggests the practice furthest from its target, or keeping the rhythm when every target was met', () => {
    const r = weekRecap(cats, [L('e', '2026-10-05', 200), L('u', '2026-10-06', 30)], WEEK)!;
    expect(suggestion(r)).toMatchObject({ kind: 'lowest', practice: { name: 'Upskilling' } });
    const met = weekRecap(cats, [L('e', '2026-10-05', 210), L('u', '2026-10-06', 150)], WEEK)!;
    expect(suggestion(met).kind).toBe('all-met');
  });
});

describe('the recap email (NOTIF-06)', () => {
  const unsubscribe = unsubscribeLink('uid123', 'recap', 'secret');
  const cats = [cat('e', 'Exercise', 30), cat('m', 'Meditation', 10, { order: 1, color: '#8A4FA3' })];

  it('shows the week, each practice with a bar, the comparison, streak and one suggestion', () => {
    const logs = [...['05', '06', '07', '08', '09', '10', '11'].map(d => L('m', `2026-10-${d}`, 10)), L('e', '2026-10-06', 60), L('e', '2026-09-29', 20)];
    const e = recapEmail({ name: 'Asha', recap: weekRecap(cats, logs, WEEK)!, unsubscribe });
    expect(e.subject).toBe('Your week on TikTym: 130 minutes');
    for (const s of ['Your week, Asha', "Here's how 5 to 11 October went.", '>130<', 'minutes, of 280 planned', '7 of 7', 'best day, Tuesday',
      '60 of 210 min', '70 of 70 min', 'background:#8A4FA3', "That's 110 minutes more than the week before.", "You've shown up 7 days in a row.",
      '<strong>Exercise</strong> got 60 of 210 minutes', 'utm_campaign=weekly_recap', 'Weekly recap is on'])
      expect(e.html).toContain(s);
    expect(e.text).toContain('- Exercise: 60 of 210 min');
    expect(e.headers['List-Unsubscribe']).toBe(`<${unsubscribe}>`);
    expect(e.html).toContain(unsubscribe.replace(/&/g, '&amp;'));
  });

  it('a lighter week is never a telling-off', () => {
    const e = recapEmail({ name: 'Asha', recap: weekRecap(cats, [L('e', '2026-10-06', 10), L('e', '2026-09-29', 200)], WEEK)!, unsubscribe });
    expect(e.html).toContain("A lighter week than the one before, and that's fine. Every minute counts.");
    expect(e.html).not.toMatch(/fewer|less than|only \d|behind|missed/i);
  });

  it('a quiet week gets a short fresh start with 5 minutes of the easiest practice, and no numbers', () => {
    const e = recapEmail({ name: 'Asha', recap: weekRecap(cats, [L('e', '2026-09-29', 30)], WEEK)!, easiest: 'Meditation', unsubscribe });
    expect(e.subject).toBe('A fresh week on TikTym');
    expect(e.html).toContain("You don't need to make up for it");
    expect(e.html).toContain('Start 5 minutes of Meditation');
    expect(e.html).not.toContain('planned');
  });

  it('escapes practice names, signs off as Praveen, with no title or company name', () => {
    const e = recapEmail({ name: '', recap: weekRecap([cat('x', 'Guitar & <b>', 20)], [L('x', '2026-10-06', 5)], WEEK)!, unsubscribe });
    expect(e.html).toContain('Guitar &amp; &lt;b&gt;');
    expect(e.html).not.toContain('<b>');
    for (const part of [e.html, e.text]) {
      expect(part).toContain('Helping busy people like you make time for what matters.');
      expect(part).not.toMatch(/Founder|Pramal/);
    }
  });
});

describe('the weekly recap at any size (NOTIF-16)', () => {
  const week = '2026-10-05', monday = '2026-10-12';

  it('looks only at accounts with an entry in the week or the one before', () => {
    expect(recapFrom(week)).toBe('2026-09-28');
    expect(recapCheck({ lastLogged: '2026-09-28' }, week, monday)).toBe('send');
    expect(recapCheck({ lastLogged: '2026-10-12' }, week, monday)).toBe('send'); // logged this morning too
    expect(recapCheck({ lastLogged: '2026-09-27' }, week, monday)).toBe('inactive');
    expect(recapCheck({}, week, monday)).toBe('inactive');
    expect(recapCheck(undefined, week, monday)).toBe('inactive');
  });

  it('never twice for the same week, even if the job or a send runs again', () => {
    expect(recapCheck({ lastLogged: '2026-10-10', recapWeek: week }, week, monday)).toBe('sent');
    expect(recapCheck({ lastLogged: '2026-10-10', recapWeek: '2026-09-28' }, week, monday)).toBe('send');
  });

  it('skipped for the week if another TikTym email already went that day (NOTIF-08)', () => {
    expect(recapCheck({ lastLogged: '2026-10-10', lastEmailDay: monday }, week, monday)).toBe('emailed-today');
    expect(recapCheck({ lastLogged: '2026-10-10', lastEmailDay: '2026-10-11' }, week, monday)).toBe('send');
  });

  it('the Monday job queries and queues, one named task per account and week, sent 2 a second with retries', () => {
    const src = readFileSync('functions/src/index.ts', 'utf8');
    const job = src.slice(src.indexOf('export const weeklyRecap'), src.indexOf('export const recapSend'));
    expect(job).not.toContain('listUsers'); // no longer goes through every sign-up
    expect(job).toContain(".where('lastLogged', '>=', recapFrom(week))");
    expect(job).toContain("taskQueue('locations/asia-south1/functions/recapSend')");
    expect(job).toContain('{ id: `recap-${d.id}-${week}` }');
    const sender = src.slice(src.indexOf('export const recapSend'), src.indexOf('/** Keeps mail/{uid}.lastLogged'));
    expect(sender).toContain('maxDispatchesPerSecond: 2');
    expect(sender).toContain('maxAttempts: 3');
    expect(sender).toContain("emailOn(settings.data(), 'recap')");
    expect(sender).toContain('`recap-${uid}-${week}`'); // Resend's idempotency key: a retry after a send can't email twice
  });
});
