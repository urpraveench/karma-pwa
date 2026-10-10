import { describe, expect, it } from 'vitest';
import { deviceGone, reminderCheck, reminderPayload, reminderTarget, sendToDevices, type ReminderDoc } from '../functions/src/push';
import { nearestTime, REMINDER_TIMES, reminderOn, reminderText, reminderTime, slotAt, timeLabel, utcSlot } from '../src/lib/reminders';

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
  });

  it("the server's job looks for the 15-minute slot it runs in", () => {
    expect(slotAt(new Date('2026-10-07T13:30:05Z'))).toBe('13:30');
    expect(slotAt(new Date('2026-10-07T13:44:59Z'))).toBe('13:30');
  });

  it('an account is in a slot only with the reminder on and a device to send to', () => {
    const now = new Date('2026-10-07T06:00:00Z');
    expect(reminderTarget({ reminder: { time: '19:00', tz: 'Asia/Kolkata' } }, 1, now)).toEqual({ slot: '13:30', time: '19:00', tz: 'Asia/Kolkata', devices: 1 });
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

  it('carries the badge count, unless the badge is switched off (NOTIF-13)', () => {
    const left = [{ name: 'Exercise' }, { name: 'Reading' }];
    expect(JSON.parse(reminderPayload(left, true))).toMatchObject({ title: '2 practices left today', badge: 2, url: '/', tag: 'daily-reminder' });
    expect(JSON.parse(reminderPayload(left, false)).badge).toBeNull();
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
