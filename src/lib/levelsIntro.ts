import { CLEAR_SAYS, DROP_GAP, LEVEL_MAX, ON_TARGET, THRESHOLD, type LevelRule, type Levels } from './levels';
import type { DateStr } from './types';

// The levels introduction (LVL-13): three screens, once, the first time levels apply to an account.

export interface IntroScreen { title: string; body: string[] }

/**
 * Whether to show the introduction on this device: levels apply (`lv`), it hasn't been seen here, and it isn't the day
 * the account started, so choosing practices comes first (as the morning splash, TODAY-21).
 */
export function showLevelsIntro(seen: boolean, lv: Levels | null, T: DateStr, categories: { startDate: DateStr }[]): boolean {
  return !seen && !!lv && categories.some(c => c.startDate < T);
}

/** The three screens, in the person's own numbers. `fresh` is an account that started on or after the day levels began. */
export function introScreens(lv: Levels, rule: LevelRule, fresh: boolean): IntroScreen[] {
  const n = lv.level, next = n + 1, pct = Math.round(ON_TARGET * 100);
  return [
    {
      title: fresh ? 'Meet your level' : 'Introducing levels',
      body: fresh
        ? ['TikTym has 10 levels. Everyone starts at Level 1, and you climb by showing up.']
        : [`TikTym now has 10 levels. You start at Level ${n}, worked out from how often you've hit your targets these last 4 weeks.`],
    },
    {
      title: 'Your level sets the rules',
      body: [
        CLEAR_SAYS[rule.clear],
        `Every ${rule.shieldDays} clear days in a row earn a shield, and you can hold ${rule.shieldMax}. A shield keeps your streak on a day you miss.`,
        'Lower levels ask less and hand out more shields. The higher you go, the more each minute counts.',
      ],
    },
    {
      title: 'Climb every Monday',
      body: n === LEVEL_MAX
        ? [`Each Monday, TikTym looks at your last 2 weeks. You're at the top: stay on target on ${THRESHOLD[LEVEL_MAX] - DROP_GAP}% of your practice days to keep it.`,
          `A day counts as on target from ${pct}% of a practice's target.`]
        : [`Each Monday, TikTym looks at your last 2 weeks. Be on target on ${THRESHOLD[next]}% of your practice days and you move up to Level ${next}.`,
          `A day counts as on target from ${pct}% of a practice's target. If a fortnight goes badly, your level eases off one step so you can find your feet.`],
    },
  ];
}
