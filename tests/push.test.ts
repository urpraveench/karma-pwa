import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deviceGone, nudgeCheck, nudgePayload, nudgeSlotFor, practiceCheck, practicePayload, practiceSlotsFor, practiceTag, reminderCheck, reminderPayload, reminderTarget, retryablePush, sendToDevices, webPushTopic, type ReminderDoc } from '../functions/src/push';
import { badgeCount, nearestTime, practiceRemindTime, REMINDER_TIMES, reminderOn, reminderText, reminderTime, slotAt, timeLabel, utcSlot } from '../src/lib/reminders';

describe('when the daily reminder goes (NOTIF-09)', () => {
  it('times run every 15 minutes from 7 am to 9:45 pm, never at night', () => {
    expect(REMINDER_TIMES[0]).toBe('07:00');
    expect(REMINDER_TIMES.at(-1)).toBe('21:45');
    expect(REMINDER_TIMES).toHaveLength(60);
    expect(nearestTime(new Date(2026, 9, 7, 19, 38))).toBe('19:45');
    expect(nearestTime(new Date(2026, 9, 7, 23, 10))).toBe('21:45');
    expect(nearestTime(new Date(2026, 9, 7, 5, 0))).toBe('07:00');
    expect([timeLabel('07:00'), timeLabel('19:30'), timeLabel('12:15')]).toEqual(['7 am', '7:30 pm', '12:15 pm']);
  });

  it('on to start, at 7 pm until a time is picked', () => {
    expect(reminderOn({})).toBe(true);
    expect(reminderOn({ reminder: { on: false } })).toBe(false);
    expect(reminderTime({})).toBe('19:00');
    expect(reminderTime({ reminder: { time: '08:30' } })).toBe('08:30');
    expect(reminderTime({ reminder: { time: '03:00' } })).toBe('19:00'); // not an allowed time
  });

  it("in the person's own time zone, daylight saving included", () => {
    expect(utcSlot('08:00', 'Asia/Kolkata', '2026-10-07')).toBe('02:30');
    expect(utcSlot('19:00', 'Asia/Kolkata', '2026-10-07')).toBe('13:30');
    expect(utcSlot('19:00', 'Europe/London', '2026-07-01')).toBe('18:00');
    expect(utcSlot('19:00', 'Europe/London', '2026-12-01')).toBe('19:00');
    expect(utcSlot('07:15', 'America/New_York', '2026-12-01')).toBe('12:15');
    expect(utcSlot('21:45', 'Asia/Kathmandu', '2026-10-07')).toBe('16:00');
    expect(utcSlot('19:00', 'Asia/Calcutta', '2026-10-07')).toBe('13:30'); // the older name some browsers report
  });

  it("the server's job looks for the 15-minute slot it runs in", () => {
    expect(slotAt(new Date('2026-10-07T13:30:05Z'))).toBe('13:30');
    expect(slotAt(new Date('2026-10-07T13:44:59Z'))).toBe('13:30');
  });

  it('an account is in a slot only with the reminder on and a device to send to', () => {
    const now = new Date('2026-10-07T06:00:00Z');
    expect(reminderTarget({ reminder: { time: '19:00', tz: 'Asia/Kolkata' } }, 1, now)).toEqual({ slot: '13:30', time: '19:00', tz: 'Asia/Kolkata', devices: 1, nudgeSlot: '14:30', practiceSlots: [] });
    expect(reminderTarget({ reminder: { time: '19:00', tz: 'Asia/Kolkata' } }, 0, now).slot).toBeNull();
    expect(reminderTarget({ reminder: { on: false, tz: 'Asia/Kolkata' } }, 2, now).slot).toBeNull();
  });

  it('once a day; waits when daylight saving moved the slot early; never after 10 pm', () => {
    const doc: ReminderDoc = { slot: '13:30', time: '19:00', tz: 'Asia/Kolkata', devices: 1 };
    const at = new Date('2026-10-07T13:30:20Z');
    expect(reminderCheck(doc, at)).toEqual({ act: 'send', date: '2026-10-07', slot: '13:30' });
    expect(reminderCheck({ ...doc, lastSent: '2026-10-07' }, at).act).toBe('sent-today');
    expect(reminderCheck({ ...doc, lastSent: '2026-10-06' }, at).act).toBe('send');
    const london: ReminderDoc = { slot: '19:00', time: '19:00', tz: 'Europe/London', devices: 1 }; // set in winter, now summer
    expect(reminderCheck(london, new Date('2026-07-01T17:00:00Z'))).toMatchObject({ act: 'later', slot: '18:00' });
    expect(reminderCheck({ ...doc, time: '21:45' }, new Date('2026-10-07T16:45:00Z')).act).toBe('too-late'); // 22:15 in India
  });
});

describe('what the reminder says (NOTIF-09)', () => {
  it('names what is left, gently', () => {
    expect(reminderText([{ name: 'Reading' }])).toEqual({ title: 'Reading is left today', body: 'Even 5 minutes counts.' });
    expect(reminderText([{ name: 'Exercise' }, { name: 'Reading' }])).toEqual({ title: '2 practices left today', body: 'Exercise and Reading. Even 5 minutes counts.' });
    expect(reminderText(['Exercise', 'Reading', 'Upskilling'].map(name => ({ name }))).body).toBe('Exercise, Reading and Upskilling. Even 5 minutes counts.');
  });

  it('the badge counts practices, never minutes, and is empty when off or clear (NOTIF-13)', () => {
    expect(badgeCount({}, ['a', 'b'])).toBe(2);
    expect(badgeCount({ badge: false }, ['a', 'b'])).toBe(0);
    expect(badgeCount({}, [])).toBe(0);
  });

  it('carries the badge count, unless the badge is switched off (NOTIF-13)', () => {
    const left = [{ name: 'Exercise' }, { name: 'Reading' }];
    expect(JSON.parse(reminderPayload(left, true))).toMatchObject({ title: '2 practices left today', badge: 2, url: '/', tag: 'daily-reminder' });
    expect(JSON.parse(reminderPayload(left, false)).badge).toBeNull();
  });
});

describe('how the reminder looks (NOTIF-09)', () => {
  it("shows TikTym's icon, and the white ring Android puts in the status bar; both files exist", () => {
    const sw = readFileSync('public/push-sw.js', 'utf8');
    expect(sw).toContain("icon: '/icons/icon-192.png'");
    expect(sw).toContain("badge: '/icons/badge-96.png'");
    for (const f of ['icon-192.png', 'badge-96.png']) expect(existsSync(`public/icons/${f}`), f).toBe(true);
  });
});

describe('expired devices (NOTIF-11)', () => {
  it('404 and 410 from the push service mean the device is gone; anything else is retried', () => {
    expect([404, 410].map(deviceGone)).toEqual([true, true]);
    expect([400, 429, 500, undefined].map(deviceGone)).toEqual([false, false, false, false]);
  });

  it('a gone device is removed and the others still get it; other failures are reported for a retry', async () => {
    const removed: string[] = [];
    const fail = (statusCode: number) => Object.assign(new Error('push'), { statusCode });
    const send = async (d: string) => { if (d === 'old') throw fail(410); if (d === 'busy') throw fail(503); };
    const r = await sendToDevices(['phone', 'old', 'laptop'], send, async d => { removed.push(d); });
    expect(r).toMatchObject({ sent: 2, removed: 1, failed: null });
    expect(removed).toEqual(['old']);
    expect((await sendToDevices(['busy'], send, async () => {})).failed).toBeTruthy();
  });
});

describe('the 8 pm evening log check (NOTIF-18)', () => {
  it("8 pm in the person's own time zone, on by default, off with the switch or no device", () => {
    expect(nudgeSlotFor({}, 1, 'Asia/Kolkata', '2026-10-07')).toBe('14:30');
    expect(nudgeSlotFor({}, 1, 'Europe/London', '2026-07-01')).toBe('19:00');
    expect(nudgeSlotFor({ logNudge: false }, 1, 'Asia/Kolkata', '2026-10-07')).toBeNull();
    expect(nudgeSlotFor({}, 0, 'Asia/Kolkata', '2026-10-07')).toBeNull();
    // independent of the daily reminder: still on with the reminder switched off
    expect(reminderTarget({ reminder: { on: false, tz: 'Asia/Kolkata' } }, 1, new Date('2026-10-07T06:00:00Z'))).toMatchObject({ slot: null, nudgeSlot: '14:30' });
  });

  const doc: ReminderDoc = { slot: '13:30', time: '19:00', tz: 'Asia/Kolkata', devices: 1, nudgeSlot: '14:30' };
  const at = new Date('2026-10-07T14:30:20Z'); // 8:00 pm in India
  const quiet = { logged: false, due: true };

  it('only when nothing is logged today and something was due', () => {
    expect(nudgeCheck(doc, at, quiet)).toEqual({ act: 'send', date: '2026-10-07', slot: '14:30' });
    expect(nudgeCheck(doc, at, { logged: true, due: true }).act).toBe('logged');
    expect(nudgeCheck(doc, at, { logged: false, due: false }).act).toBe('nothing-due');
  });

  it('once a day; after a reminder set between 7 and 8 pm, not that day; the 7 pm default and the 8 pm check both go; never after 10 pm', () => {
    expect(nudgeCheck({ ...doc, nudgeSent: '2026-10-07' }, at, quiet).act).toBe('sent-today');
    expect(nudgeCheck({ ...doc, time: '19:00', lastSent: '2026-10-07' }, at, quiet).act).toBe('send'); // the default: an hour apart
    expect(nudgeCheck({ ...doc, time: '19:30', lastSent: '2026-10-07' }, at, quiet).act).toBe('just-reminded');
    expect(nudgeCheck({ ...doc, time: '20:00', lastSent: '2026-10-07' }, at, quiet).act).toBe('just-reminded');
    expect(nudgeCheck({ ...doc, time: '19:30', lastSent: '2026-10-06' }, at, quiet).act).toBe('send'); // yesterday's
    expect(nudgeCheck({ ...doc, time: '21:00', lastSent: '2026-10-07' }, at, quiet).act).toBe('send'); // a later reminder comes after
    expect(nudgeCheck(doc, new Date('2026-10-07T16:45:00Z'), quiet).act).toBe('too-late');
    const london: ReminderDoc = { ...doc, tz: 'Europe/London', nudgeSlot: '20:00' }; // set in winter, now summer
    expect(nudgeCheck(london, new Date('2026-07-01T18:00:00Z'), quiet)).toMatchObject({ act: 'later', slot: '19:00' });
  });

  it('asks, and points to the quickest way to answer', () => {
    expect(JSON.parse(nudgePayload(2, true))).toEqual({ title: 'Did you log what you did today?', body: 'Tap the mic and just say it.', badge: 2, url: '/', tag: 'log-nudge' });
    expect(JSON.parse(nudgePayload(2, false)).badge).toBeNull();
  });

  it('the 15-minute job queues it alongside the reminders; records from before it get their 8 pm slot', () => {
    const src = readFileSync('functions/src/index.ts', 'utf8');
    expect(src).toContain("where('nudgeSlot', '==', slot)");
    expect(src).toContain("queue.enqueue({ uid: d.id, kind: 'nudge' })");
    expect(src).toContain('if (doc.nudgeSlot === undefined) fix.nudgeSlot');
  });
});


describe("a practice's own reminder (NOTIF-19, NOTIF-20)", () => {
  const cat = (id: string, name: string, remind?: string | null, archivedFrom: string | null = null) => ({ id, name, remind, archivedFrom });
  const cats = [cat('r', 'Reading', '10:00'), cat('e', 'Exercise', '10:00'), cat('w', 'Writing', '16:00'), cat('m', 'Meditation'), cat('o', 'Old', '12:00', '2026-09-01')];
  const doc: ReminderDoc = { slot: '13:30', time: '19:00', tz: 'Asia/Kolkata', devices: 1, practiceSlots: ['04:30', '10:30'] };
  const ten = new Date('2026-10-07T04:30:20Z'); // 10:00 am in India
  const all = new Set(['r', 'e', 'w', 'm']);

  it('only allowed times count; none is the default', () => {
    expect(practiceRemindTime({ remind: '10:00' })).toBe('10:00');
    expect([practiceRemindTime({}), practiceRemindTime({ remind: null }), practiceRemindTime({ remind: '03:00' })]).toEqual([null, null, null]);
  });

  it("each time once, as a UTC slot in the person's time zone; archived practices and accounts without a device have none (NOTIF-20)", () => {
    expect(practiceSlotsFor(cats, 1, 'Asia/Kolkata', '2026-10-07')).toEqual(['04:30', '10:30']);
    expect(practiceSlotsFor(cats, 1, 'Europe/London', '2026-07-01')).toEqual(['09:00', '15:00']);
    expect(practiceSlotsFor(cats, 0, 'Asia/Kolkata', '2026-10-07')).toEqual([]);
    expect(reminderTarget({ reminder: { tz: 'Asia/Kolkata' } }, 1, new Date('2026-10-07T06:00:00Z'), cats).practiceSlots).toEqual(['04:30', '10:30']);
    expect(reminderTarget({ reminder: { on: false, tz: 'Asia/Kolkata' } }, 1, new Date('2026-10-07T06:00:00Z'), cats)).toMatchObject({ slot: null, practiceSlots: ['04:30', '10:30'] });
  });

  it('at its time, only while the practice is still due; practices set for the same time share one', () => {
    const r = practiceCheck(cats, doc, ten, all);
    expect(r.send.map(c => c.id)).toEqual(['r', 'e']);
    expect(r.handled).toEqual(['r', 'e']);
    expect(r.date).toBe('2026-10-07');
    const done = practiceCheck(cats, doc, ten, new Set(['e', 'w'])); // Reading is done for today
    expect(done.send.map(c => c.id)).toEqual(['e']);
    expect(done.handled).toEqual(['r', 'e']);
    expect(practiceCheck(cats, doc, new Date('2026-10-07T10:30:00Z'), all).send.map(c => c.id)).toEqual(['w']);
  });

  it('once a day; not before its time, not over an hour late, never after 10 pm', () => {
    expect(practiceCheck(cats, { ...doc, practiceSent: { r: '2026-10-07' } }, ten, all).send.map(c => c.id)).toEqual(['e']);
    expect(practiceCheck(cats, { ...doc, practiceSent: { r: '2026-10-06', e: '2026-10-06' } }, ten, all).send).toHaveLength(2);
    expect(practiceCheck(cats, doc, new Date('2026-10-07T04:15:00Z'), all).send).toEqual([]); // 9:45 am
    expect(practiceCheck(cats, doc, new Date('2026-10-07T05:30:00Z'), all).send).toEqual([]); // 11 am
    const late = [cat('n', 'Night reading', '21:45')];
    expect(practiceCheck(late, doc, new Date('2026-10-07T16:30:00Z'), new Set(['n'])).send).toEqual([]); // 10 pm
  });

  it('daylight saving: the slots are worked out for the day it runs (NOTIF-20)', () => {
    const london: ReminderDoc = { ...doc, tz: 'Europe/London', practiceSlots: ['10:00', '16:00'] }; // set in winter, now summer
    const r = practiceCheck(cats, london, new Date('2026-07-01T09:00:00Z'), all);
    expect(r.slots).toEqual(['09:00', '15:00']);
    expect(r.send.map(c => c.id)).toEqual(['r', 'e']);
  });

  it('says what to do, gently, with the badge count unless the badge is off', () => {
    expect(JSON.parse(practicePayload([{ name: 'Reading', remind: '10:00' }], 3, true))).toEqual({ title: 'Time for Reading', body: 'Even 5 minutes counts.', badge: 3, url: '/', tag: 'practice-1000' });
    expect(JSON.parse(practicePayload([{ name: 'Reading', remind: '10:00' }, { name: 'Exercise', remind: '10:00' }], 3, false))).toMatchObject({ title: 'Time for Reading and Exercise', badge: null });
  });

  it('the 15-minute job queues them by slot, and a practice change keeps the record in step', () => {
    const src = readFileSync('functions/src/index.ts', 'utf8');
    expect(src).toContain("where('practiceSlots', 'array-contains', slot)");
    expect(src).toContain("queue.enqueue({ uid: d.id, kind: 'practice' })");
    expect(src).toContain("document: 'users/{uid}/categories/{id}'");
  });
});

describe('pushes every service accepts (NOTIF-21)', () => {
  it('pads each topic TikTym sends to a length Apple can decode, keeping only URL-safe letters', () => {
    for (const name of ['daily-reminder', 'log-nudge', practiceTag('09:30'), practiceTag('21:45'), 'bcAbCdEfGhIjKlMnOpQrSt']) {
      const t = webPushTopic(name);
      expect(t).toMatch(/^[A-Za-z0-9_-]{4,32}$/);
      expect(t.length % 4).toBe(0);
      expect(t.startsWith(name)).toBe(true);
    }
    expect(webPushTopic('log-nudge')).toBe('log-nudge000');
    expect(webPushTopic('practice-0930')).toBe('practice-0930000');
    expect(webPushTopic('daily-reminder')).toBe('daily-reminder00');
    expect(webPushTopic('a b:c/d')).toBe('abcd');
    expect(webPushTopic('x'.repeat(40))).toHaveLength(32);
  });

  it('retries only what may work next time: no answer, too many requests, server errors; never a refused request', () => {
    expect(retryablePush(new Error('socket hang up'))).toBe(true);
    expect(retryablePush({ statusCode: 429 })).toBe(true);
    expect(retryablePush({ statusCode: 503 })).toBe(true);
    expect(retryablePush({ statusCode: 400, body: '{"reason":"BadWebPushTopic"}' })).toBe(false);
    expect(retryablePush({ statusCode: 403 })).toBe(false);
  });
});
