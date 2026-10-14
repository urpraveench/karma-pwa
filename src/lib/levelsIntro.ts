import type { Levels } from './levels';
import type { DateStr } from './types';

// The levels introduction (LVL-13): one screen, once, the first time levels apply to an account.

export interface IntroScreen { title: string; body: string[] }

/**
 * Whether to show the introduction on this device: levels apply (`lv`), it hasn't been seen here, and it isn't the day
 * the account started, so choosing practices comes first (as the morning splash, TODAY-21).
 */
export function showLevelsIntro(seen: boolean, lv: Levels | null, T: DateStr, categories: { startDate: DateStr }[]): boolean {
  return !seen && !!lv && categories.some(c => c.startDate < T);
}

/** The screen's words. `fresh` is an account that started on or after the day levels began. */
export function introScreen(lv: Levels, fresh: boolean): IntroScreen {
  return {
    title: 'Your level and your coach',
    body: [
      'TikTym is here to help you reach your goals, and to keep you going with advice that fits you.',
      fresh
        ? 'Your level shows where you stand today. Everyone starts at Level 1.'
        : `Your level shows where you stand today: Level ${lv.level}, from how often you've hit your targets these last 4 weeks.`,
      'From here, your coach guides you, one step at a time, toward 100 minutes a day for your productive life.',
    ],
  };
}
