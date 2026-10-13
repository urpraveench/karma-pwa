import { describe, expect, it } from 'vitest';
import { historyEntry } from '../functions/src/adminLog';
import { audienceLabel, kindLabel, progress, when } from '../src/admin/history';

const at = { toDate: () => new Date('2026-10-13T04:30:00Z') };

describe('send history (ADMIN-12)', () => {
  it('reads an email broadcast, its headline and counts', () => {
    const e = historyEntry('b1', { kind: 'email', createdAt: at, by: 'p@x.com', audience: 'away4', subject: 'Hi', title: 'Heading', queued: 40, sent: 30, skipped: 4, skippedWhy: { off: 3, 'emailed-today': 1, x: 0 } })!;
    expect(e).toEqual({ id: 'b1', kind: 'email', at: '2026-10-13T04:30:00.000Z', by: 'p@x.com', audience: 'away4', to: null, headline: 'Hi', queued: 40, held: 0, sent: 30, skipped: 4, failed: 0, skippedWhy: { off: 3, 'emailed-today': 1 } });
    expect(kindLabel(e)).toBe('Email');
    expect(audienceLabel(e)).toBe('Away 4 days or more');
    expect(progress(e)).toEqual({ state: 'sending', text: 'Sending: 34 of 40 done. 30 sent, 4 skipped (3 News off, 1 already emailed that day)' });
    expect(when(e.at)).toBe('13 Oct, 10:00');
  });

  it('reads pushes (headline is the title) and tests (just me), and leaves out anything else', () => {
    const p = historyEntry('p1', { kind: 'push', createdAt: at, audience: 'active7', title: 'Day 1', queued: 12, held: 3, sent: 5 })!;
    expect(p.headline).toBe('Day 1');
    expect(audienceLabel(p)).toBe('Active in the last 7 days');
    expect(progress(p).text).toBe('Sending: 5 of 12 done, 3 waiting for daytime. 5 sent');
    const t = historyEntry('t1', { kind: 'push-test', createdAt: at, by: 'p@x.com', audience: 'devices', title: 'T', queued: 1, sent: 1 })!;
    expect(kindLabel(t)).toBe('Push test');
    expect(audienceLabel(t)).toBe('Just me (p@x.com)');
    expect(progress(t)).toEqual({ state: 'done', text: '1 sent' });
    expect(historyEntry('x', { kind: 'other', createdAt: at })).toBeNull();
    expect(historyEntry('x', { kind: 'email' })).toBeNull();
    expect(historyEntry('x', undefined)).toBeNull();
  });

  it('says when it\'s done, with failures, and when nobody was in the audience', () => {
    const done = historyEntry('b2', { kind: 'email', createdAt: at, audience: 'everyone', queued: 3, sent: 1, skipped: 1, skippedWhy: { 'no-email': 1 }, failed: 1 })!;
    expect(progress(done)).toEqual({ state: 'done', text: '1 sent, 1 skipped (1 no email address), 1 failed' });
    expect(progress(historyEntry('b3', { kind: 'push', createdAt: at, audience: 'devices', queued: 0 })!)).toEqual({ state: 'done', text: 'Nobody in the audience' });
  });
});

describe('one-person sends in the history (ADMIN-12)', () => {
  it('names who it went to', () => {
    const e = historyEntry('b4', { kind: 'email', createdAt: at, audience: 'person', to: 'asha@example.com', subject: 'Hello', queued: 1, sent: 1 })!;
    expect(audienceLabel(e)).toBe('One person (asha@example.com)');
    expect(historyEntry('b5', { kind: 'email', createdAt: at, audience: 'everyone', to: 'stray@example.com' })!.to).toBeNull();
  });
});
