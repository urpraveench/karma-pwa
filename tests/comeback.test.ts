import { describe, expect, it } from 'vitest';
import { comebackDue, comebackRange, daysAway, indiaToday, latestLogDate } from '../functions/src/comeback';
import { comebackEmail, unsubscribeLink } from '../functions/src/mail';

const TODAY = '2026-10-14';

describe('who gets a comeback, and when (NOTIF-07)', () => {
  it('after 3 full days with nothing logged, the next morning', () => {
    expect(comebackDue({ lastLogged: '2026-10-11' }, TODAY)).toBe(false); // 12th and 13th empty: 2 days
    expect(comebackDue({ lastLogged: '2026-10-10' }, TODAY)).toBe(true); // 11th, 12th, 13th empty
    expect(daysAway('2026-10-10', TODAY)).toBe(4);
  });

  it('once per absence: not again until the person logs and goes quiet again', () => {
    expect(comebackDue({ lastLogged: '2026-10-08', comebackFor: '2026-10-08' }, TODAY)).toBe(false);
    expect(comebackDue({ lastLogged: '2026-10-08', comebackFor: '2026-09-20' }, TODAY)).toBe(true); // a new absence
  });

  it('only for absences that began in the last two weeks, and never for someone who has never logged', () => {
    expect(comebackDue({ lastLogged: '2026-09-30' }, TODAY)).toBe(true);
    expect(comebackDue({ lastLogged: '2026-09-29' }, TODAY)).toBe(false);
    expect(comebackDue({}, TODAY)).toBe(false); // the first-minute nudge is for them
    expect(comebackDue(undefined, TODAY)).toBe(false);
    expect(comebackRange(TODAY)).toEqual({ from: '2026-09-30', to: '2026-10-10' }); // what the daily job asks the database for
  });

  it('uses the date in India, where the emails are scheduled', () => {
    expect(indiaToday(new Date('2026-10-13T19:00:00Z'))).toBe('2026-10-14'); // 00:30 on the 14th in India
    expect(indiaToday(new Date('2026-10-14T03:30:00Z'))).toBe('2026-10-14'); // 9 am
  });

  it('finds the newest entry with minutes in a month', () => {
    expect(latestLogDate({ a: { date: '2026-10-03', minutes: 30 }, b: { date: '2026-10-09', minutes: 10 }, c: { date: '2026-10-12', minutes: 0 } })).toBe('2026-10-09');
    expect(latestLogDate({})).toBeNull();
    expect(latestLogDate(undefined)).toBeNull();
  });
});

describe('at most one email a day (NOTIF-08)', () => {
  it('the comeback waits a day if another email went today', () => {
    expect(comebackDue({ lastLogged: '2026-10-08', lastEmailDay: TODAY }, TODAY)).toBe(false);
    expect(comebackDue({ lastLogged: '2026-10-08', lastEmailDay: '2026-10-13' }, TODAY)).toBe(true);
  });
});

describe('the comeback email (NOTIF-07)', () => {
  const unsubscribe = unsubscribeLink('uid123', 'tips', 'secret');
  const e = comebackEmail({ name: 'Ravi', practice: { name: 'Meditation', minutes: 10, color: '#8A4FA3' }, days: 4, unsubscribe });

  it('says no catching up, and suggests 5 minutes of the shortest practice', () => {
    expect(e.subject).toBe('5 minutes of Meditation today?');
    for (const s of ['Pick up where you left off', 'Hi Ravi,', "It's been 4 days since your last entry", "You don't need to make up for the missed days.",
      '5 minutes of Meditation today', 'Start 5 minutes of Meditation', '5 min today', 'utm_campaign=comeback', "It's sent once per break."])
      expect(e.html).toContain(s);
    expect(e.html).not.toMatch(/streak|lost|behind|missed you/i);
  });

  it('carries the unsubscribe link, and signs off as Praveen with no title or company name', () => {
    expect(e.headers['List-Unsubscribe']).toBe(`<${unsubscribe}>`);
    expect(e.text).toContain(`Unsubscribe: ${unsubscribe}`);
    for (const part of [e.html, e.text]) {
      expect(part).toContain('Helping busy people like you make time for what matters.');
      expect(part).not.toMatch(/Founder|Pramal/);
    }
  });
});
