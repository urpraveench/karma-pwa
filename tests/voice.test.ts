import { describe, expect, it } from 'vitest';
import { TIERS } from '../src/lib/levels';
import { celebrateText, comebackText, nudgeText, rollText, steadyLine, voiceOf } from '../src/lib/voice';

describe("the coach's voice by tier", () => {
  it('Steady before levels, then the tier of the level (COACH-01)', () => {
    expect([null, undefined, 1, 2, 3, 6, 8, 10].map(voiceOf)).toEqual(['Steady', 'Steady', 'Starting', 'Starting', 'Building', 'Steady', 'Strong', 'Relentless']);
  });

  it("Steady keeps the words from before levels, and every tier says something different (COACH-02 to COACH-06)", () => {
    expect(nudgeText('Steady', 30, 4, 1)).toBe('Clear 30 more to keep your 4-day streak without using a shield');
    expect(celebrateText('Steady', 7)).toBe('7-day streak. ');
    expect(celebrateText('Steady', 1)).toBe('Nothing left today. ');
    expect(rollText('Steady', 5, 30)).toBe('5 clear days in a row. 30 points keeps it going.');
    expect(comebackText('Steady', 4, 10, 'Reading')).toBe("It's been 4 days. No catching up today. 10 minutes of Reading makes today count.");
    expect(steadyLine('Steady').strong).toBe('Steady.');
    for (const f of [(t: typeof TIERS[number]) => nudgeText(t, 5, 3, 0), (t: typeof TIERS[number]) => celebrateText(t, 3), (t: typeof TIERS[number]) => rollText(t, 3, 5), (t: typeof TIERS[number]) => steadyLine(t).strong])
      expect(new Set(TIERS.map(f)).size).toBe(TIERS.length);
  });

  it('each tier in its own words (COACH-02 to COACH-05)', () => {
    expect(nudgeText('Starting', 5, 3, 2)).toBe('5 minutes keeps your 3-day streak. Smallest win of the day.');
    expect(nudgeText('Starting', 1, 3, 0)).toBe('1 minute keeps your 3-day streak. Smallest win of the day.');
    expect(nudgeText('Relentless', 30, 21, 1)).toBe("30 minutes stand between you and day 22. Records don't break themselves.");
    expect(celebrateText('Starting', 1)).toBe('Everything done today. That counts double. ');
    expect(rollText('Strong', 9, 40)).toBe("9 clear days in a row. 40 points left. Don't negotiate with yourself.");
    expect(comebackText('Strong', 3, 10, 'Exercise')).toBe("3 days off isn't like you. 10 minutes of Exercise restarts the engine.");
  });
});
