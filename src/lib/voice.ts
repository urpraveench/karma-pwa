import { tierOf, type Tier } from './levels';

// The coach's voice by tier (COACH-01): gentle at Starting, blunt and witty at Relentless. Steady is the voice from before
// levels, so nothing reads differently until levels begin.

/** The tier whose voice to use: Steady before levels began. */
export const voiceOf = (level: number | null | undefined): Tier => level ? tierOf(level) : 'Steady';

const mins = (n: number) => `${n} minute${n === 1 ? '' : 's'}`;

/** The evening nudge on Today (TODAY-13): `keep` is what the level still needs today. */
export function nudgeText(tier: Tier, keep: number, streak: number, shields: number): string {
  switch (tier) {
    case 'Starting': return `${mins(keep)} keeps your ${streak}-day streak. Smallest win of the day.`;
    case 'Building': return `${keep} more and your ${streak}-day streak lives. Your excuses are getting nervous.`;
    case 'Strong': return `${keep} left for day ${streak + 1}. You've done harder before breakfast.`;
    case 'Relentless': return `${keep} minutes stand between you and day ${streak + 1}. Records don't break themselves.`;
    default: return `Clear ${keep} more to keep your ${streak}-day streak${shields ? ' without using a shield' : ''}`;
  }
}

/** The first words of the "All clear" celebration (LOG-04), before any milestone or shield line. */
export function celebrateText(tier: Tier, streak: number): string {
  const s = streak > 1 ? `${streak}-day streak.` : '';
  switch (tier) {
    case 'Starting': return s ? `${s} Look at you, showing up. ` : 'Everything done today. That counts double. ';
    case 'Building': return s ? `${s} The habit is moving in. ` : 'Nothing left today. Momentum unlocked. ';
    case 'Strong': return s ? `${s} Clean work. ` : 'Nothing left today. Clean work. ';
    case 'Relentless': return s ? `${s} Of course. ` : 'Nothing left today. Of course. ';
    default: return s ? `${s} ` : 'Nothing left today. ';
  }
}

/** The body of the "on a roll" card (MOM-08). */
export function rollText(tier: Tier, streak: number, keep: number): string {
  switch (tier) {
    case 'Starting': return `${streak} days in a row. ${mins(keep)} keeps it going. That's all it takes.`;
    case 'Building': return `${streak} clear days in a row. ${keep} more and the chain grows.`;
    case 'Strong': return `${streak} clear days in a row. ${keep} points left. Don't negotiate with yourself.`;
    case 'Relentless': return `${streak} clear days in a row. ${keep} points left. Finish what you started.`;
    default: return `${streak} clear days in a row. ${keep} points keeps it going.`;
  }
}

/** The body of the comeback card (MOM-02): `days` away, back with `goal` minutes of `practice`. */
export function comebackText(tier: Tier, days: number, goal: number, practice: string): string {
  switch (tier) {
    case 'Starting': return `It's been ${days} days, and that's fine. ${goal} minutes of ${practice} and you're back.`;
    case 'Strong': return `${days} days off isn't like you. ${goal} minutes of ${practice} restarts the engine.`;
    case 'Relentless': return `${days} days quiet. Everyone has an off week; nobody needs an off month. ${goal} minutes of ${practice}, now.`;
    default: return `It's been ${days} days. No catching up today. ${goal} minutes of ${practice} makes today count.`;
  }
}

/** Insights' coach line when nothing else stands out (INS-20). */
export function steadyLine(tier: Tier): { strong: string; rest: string } {
  switch (tier) {
    case 'Starting': return { strong: 'You showed up.', rest: " That's the hardest part, and you keep doing it." };
    case 'Building': return { strong: 'Building.', rest: ' Nothing is slipping. Each clear day makes the next one easier.' };
    case 'Strong': return { strong: 'Strong.', rest: ' Nothing is slipping. Raise a target when one starts to feel easy.' };
    case 'Relentless': return { strong: 'Relentless.', rest: ' Nothing is slipping. The only competition left is your best run.' };
    default: return { strong: 'Steady.', rest: ' Nothing is slipping. Keep showing up and the streak takes care of itself.' };
  }
}
