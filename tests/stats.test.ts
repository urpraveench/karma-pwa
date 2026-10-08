import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { count, countActiveDevice, FLUSH_AFTER_MS, flushStats, resetStats, setStatsSink, type Counts } from '../src/lib/stats';

// Anonymous daily totals (STAT-01, STAT-02), with a fake sink in place of Firestore.
const store = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 8, 10));
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  store.clear();
});
afterEach(() => { resetStats(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function sink() {
  const saves: { day: string; counts: Counts }[] = [];
  setStatsSink(async (day, counts) => { saves.push({ day, counts }); });
  return saves;
}

describe('anonymous daily totals', () => {
  it('collects counts and saves them together after 15 seconds', () => {
    const saves = sink();
    count('logs'); count('minutes', 30); count('logQuick'); count('logs'); count('minutes', 15);
    expect(saves).toHaveLength(0);
    vi.advanceTimersByTime(FLUSH_AFTER_MS);
    expect(saves).toEqual([{ day: '2026-10-08', counts: { logs: 2, minutes: 45, logQuick: 1 } }]);
  });

  it('saves straight away when asked (app hidden or closed)', () => {
    const saves = sink();
    count('timersStarted');
    flushStats();
    expect(saves).toEqual([{ day: '2026-10-08', counts: { timersStarted: 1 } }]);
  });

  it('never sends more in one save than the security rules allow', () => {
    const saves = sink();
    for (let i = 0; i < 90; i++) count('logs');
    flushStats();
    expect(saves.map(s => s.counts.logs)).toEqual([80, 10]);
    expect(saves.every(s => (s.counts.logs ?? 0) <= 100)).toBe(true);
  });

  it('counts a device once a day, keeping only the date on the device', () => {
    const saves = sink();
    countActiveDevice(); countActiveDevice();
    flushStats();
    expect(saves).toEqual([{ day: '2026-10-08', counts: { activeDevices: 1 } }]);
    expect([...store.values()]).toEqual(['2026-10-08']); // nothing but a date
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    countActiveDevice();
    flushStats();
    expect(saves[1]).toEqual({ day: '2026-10-09', counts: { activeDevices: 1 } });
  });

  it('does nothing without a sink (test mode, signed out)', () => {
    count('logs');
    countActiveDevice();
    flushStats();
    const saves = sink();
    flushStats();
    expect(saves).toHaveLength(0);
    expect(store.size).toBe(0);
  });

  it('saves what was collected when the sink goes away (sign-out)', () => {
    const saves = sink();
    count('practicesAdded');
    setStatsSink(null);
    expect(saves).toEqual([{ day: '2026-10-08', counts: { practicesAdded: 1 } }]);
  });

  it('sends only counter names and numbers', () => {
    const saves = sink();
    count('logs'); count('minutes', 25); count('cardsShared'); count('signUps');
    flushStats();
    for (const [k, v] of Object.entries(saves[0].counts)) { expect(k).toMatch(/^[a-zA-Z]+$/); expect(typeof v).toBe('number'); }
  });
});
