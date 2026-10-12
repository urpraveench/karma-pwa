import { describe, expect, it } from 'vitest';
import { broadcastPushPayload, pushActiveFrom, pushDelaySeconds, readPushDraft } from '../functions/src/pushBroadcast';

const ok = { audience: 'devices', title: 'The challenge starts today', body: 'Log 5 minutes and you are in.' };

describe('push composer drafts (ADMIN-10)', () => {
  it('accepts a draft, trimmed, opening the app at / unless a path is given', () => {
    expect(readPushDraft({ ...ok, title: ' Hi ' })).toEqual({ ...ok, title: 'Hi', url: '/' });
    expect(readPushDraft({ ...ok, url: '/?tab=insights' })?.url).toBe('/?tab=insights');
  });

  it('refuses an unknown audience, empty or long text, and a link that leaves the app', () => {
    expect(readPushDraft(null)).toBeNull();
    expect(readPushDraft({ ...ok, audience: 'everyone' })).toBeNull();
    expect(readPushDraft({ ...ok, title: '' })).toBeNull();
    expect(readPushDraft({ ...ok, title: 'x'.repeat(61) })).toBeNull();
    expect(readPushDraft({ ...ok, body: 'x'.repeat(161) })).toBeNull();
    expect(readPushDraft({ ...ok, url: 'https://evil.example' })).toBeNull();
    expect(readPushDraft({ ...ok, url: '//evil.example' })).toBeNull();
  });

  it('finds everyone with a device, or only those who logged in the last 7 days', () => {
    expect(pushActiveFrom('devices', '2026-10-13')).toBeNull();
    expect(pushActiveFrom('active7', '2026-10-13')).toBe('2026-10-07');
  });

  it('shows the title and text, opens the link, leaves the badge alone, and has its own tag', () => {
    expect(JSON.parse(broadcastPushPayload({ title: 'T', body: 'B', url: '/' }, 'abc'))).toEqual({ title: 'T', body: 'B', badge: null, url: '/', tag: 'bc-abc' });
  });
});

describe('broadcast pushes respect quiet hours (ADMIN-11)', () => {
  const india = (hhmm: string) => new Date(`2026-10-13T${hhmm}:00+05:30`);
  it('goes straight away from 7 am to before 10 pm in the person\'s time zone', () => {
    expect(pushDelaySeconds(india('07:00'), 'Asia/Kolkata')).toBe(0);
    expect(pushDelaySeconds(india('15:30'), 'Asia/Kolkata')).toBe(0);
    expect(pushDelaySeconds(india('21:59'), 'Asia/Kolkata')).toBe(0);
  });

  it('otherwise waits until 10 am there: the next morning after 10 pm, this morning before 7 am', () => {
    expect(pushDelaySeconds(india('22:00'), 'Asia/Kolkata')).toBe(12 * 3600);
    expect(pushDelaySeconds(india('23:30'), 'Asia/Kolkata')).toBe(10.5 * 3600);
    expect(pushDelaySeconds(india('02:15'), 'Asia/Kolkata')).toBe(7.75 * 3600);
    expect(pushDelaySeconds(india('06:59'), 'Asia/Kolkata')).toBe(3 * 3600 + 60);
  });

  it('uses each person\'s own time zone', () => {
    const at = new Date('2026-10-13T15:30:00Z'); // 9 pm in India, 4:30 pm in London, 11:30 am in New York
    expect(pushDelaySeconds(at, 'Asia/Kolkata')).toBe(0);
    expect(pushDelaySeconds(new Date('2026-10-13T03:00:00Z'), 'America/New_York')).toBe(11 * 3600); // 11 pm there
  });
});
