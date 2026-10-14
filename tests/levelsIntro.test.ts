import { describe, expect, it } from 'vitest';
import { RULES, type Levels } from '../src/lib/levels';
import { introScreens, showLevelsIntro } from '../src/lib/levelsIntro';

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

  it('three screens in the person\'s own numbers: an existing account', () => {
    const s = introScreens(lv(6), RULES[6], false);
    expect(s.map(x => x.title)).toEqual(['Introducing levels', 'Your level sets the rules', 'Climb every Monday']);
    expect(s[0].body).toEqual(["TikTym now has 10 levels. You start at Level 6, worked out from how often you've hit your targets these last 4 weeks."]);
    expect(s[1].body[0]).toBe('A day is clear when every practice is done, carried-over minutes included.');
    expect(s[1].body[1]).toBe('Every 3 clear days in a row earn a shield, and you can hold 3. A shield keeps your streak on a day you miss.');
    expect(s[2].body[0]).toBe('Each Monday, TikTym looks at your last 2 weeks. Be on target on 65% of your practice days and you move up to Level 7.');
    expect(s[2].body[1]).toMatch(/^A day counts as on target from 80% of a practice's target\. If a fortnight goes badly/);
  });

  it('a new account starts at Level 1; Level 10 is told how to keep it', () => {
    const fresh = introScreens(lv(1), RULES[1], true);
    expect(fresh[0]).toEqual({ title: 'Meet your level', body: ['TikTym has 10 levels. Everyone starts at Level 1, and you climb by showing up.'] });
    expect(fresh[1].body[0]).toBe('A day is clear when you do 5 minutes or more on any practice.');
    expect(fresh[2].body[0]).toMatch(/Be on target on 15% of your practice days and you move up to Level 2\.$/);
    expect(introScreens(lv(10), RULES[10], false)[2].body[0]).toBe("Each Monday, TikTym looks at your last 2 weeks. You're at the top: stay on target on 83% of your practice days to keep it.");
  });
});
