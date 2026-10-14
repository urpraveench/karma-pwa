import { describe, expect, it } from 'vitest';
import type { Levels } from '../src/lib/levels';
import { introScreen, showLevelsIntro } from '../src/lib/levelsIntro';

const lv = (level: number): Levels => ({ level, moves: [{ date: '2026-10-19', level }], score: 70, nextCheck: '2026-10-26' });
const cats = [{ startDate: '2026-10-01' }];

describe('the levels introduction (LVL-13)', () => {
  it('shows once levels apply, until seen on this device, never on the day the account started', () => {
    expect(showLevelsIntro(false, lv(4), '2026-10-21', cats)).toBe(true);
    expect(showLevelsIntro(true, lv(4), '2026-10-21', cats)).toBe(false);
    expect(showLevelsIntro(false, null, '2026-10-07', cats)).toBe(false); // before levels
    expect(showLevelsIntro(false, lv(1), '2026-10-21', [{ startDate: '2026-10-21' }])).toBe(false);
    expect(showLevelsIntro(false, lv(1), '2026-10-22', [{ startDate: '2026-10-21' }])).toBe(true);
  });

  it("one screen: TikTym's promise, where you stand today, and the coach from here", () => {
    const s = introScreen(lv(7), cats);
    expect(s.title).toBe('Your level and your coach');
    expect(s.body).toEqual([
      'TikTym is here to help you reach your goals, and to keep you going with advice that fits you.',
      "Your level shows where you stand today: Level 7, from how often you've hit your targets these last 4 weeks.",
      'From here, your coach guides you, one step at a time, toward 100 minutes a day for your productive life.',
    ]);
    const everyone = 'Your level shows where you stand today. Everyone starts at Level 1.';
    expect(introScreen(lv(1), [{ startDate: '2026-10-21' }]).body[1]).toBe(everyone); // started after levels began
    // started 3 days before levels began: too little history to judge, so Level 1 like a new account, and told so
    expect(introScreen(lv(1), [{ startDate: '2026-10-16' }]).body[1]).toBe(everyone);
    // a week of history: the level came from it
    expect(introScreen(lv(1), [{ startDate: '2026-10-12' }]).body[1]).toBe("Your level shows where you stand today: Level 1, from how often you've hit your targets these last 4 weeks.");
  });
});
