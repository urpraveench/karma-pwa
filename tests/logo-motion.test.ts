import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { cues, duration, FILLED, fillDelay, motionStyle } from '../scripts/logo-motion';

// The motion logo (npm run brand:kit). Its look is checked by eye when it changes; these check its timing and that
// every animated file ends on, and falls back to, the exact static logo.
const LOCKUPS = ['mark', 'horizontal', 'tagline-horizontal', 'tagline-stacked'];
const THEMES = ['color', 'color-on-dark', 'white'];
const svg = (name: string) => readFileSync(`public/brand/svg/${name}.svg`, 'utf8');

describe('animated logo (GTM-23)', () => {
  it('fills the 18 beads clockwise, one every 50 ms, then pulses the gold bead (GTM-23)', () => {
    const ticks = cues().filter(c => c.sound === 'tick').map(c => c.at);
    expect(ticks).toHaveLength(FILLED);
    expect(ticks[0]).toBe(0.45);
    ticks.slice(1).forEach((at, k) => expect(at - ticks[k]).toBeCloseTo(0.05));
    expect(cues().at(-1)).toEqual({ at: 1.45, sound: 'chime' });
    expect(duration(false)).toBe(1.85);
    expect(duration(true)).toBe(2.35);
  });

  it('turns the animation off for reduced motion, and keeps colour keyframes apart per colour (GTM-23)', () => {
    const css = motionStyle({ id: 'color', ink: '#16302E', rest: '#CBD5CA', name: 'left' });
    expect(css).toContain('@media (prefers-reduced-motion:reduce){.tm-r,.tm-b,.tm-g,.tm-p,.tm-n,.tm-l{animation:none}}');
    expect(css).toContain('@keyframes tm-fill-color{from{fill:#CBD5CA}');
    expect(css).toContain('to{fill:#16302E}');
    expect(motionStyle({ id: 'x', ink: '#000', rest: '#999', name: null })).not.toContain('tm-name');
  });

  for (const lockup of LOCKUPS) for (const theme of THEMES) {
    const name = `tiktym-${lockup}-${theme}`;
    it(`${name}-animated.svg ends on the static logo, beads filling in order (GTM-23)`, () => {
      expect(existsSync(`public/brand/svg/${name}-animated.svg`)).toBe(true);
      const animated = svg(`${name}-animated`);
      expect(animated).toContain('prefers-reduced-motion');
      // Without the motion (its style, groups, classes and delays), it's the static file, byte for byte.
      const still = animated.replace(/<style>.*?<\/style>/, '').replace(/<g class="tm-[a-z]">|<\/g>/g, '')
        .replace(/ class="tm-[a-z]"/g, '').replace(/ style="[^"]*"/g, '');
      expect(still).toBe(svg(name));
      const delays = [...animated.matchAll(/class="tm-b" style="animation-delay:0\.1s,([\d.]+)s"/g)].map(m => +m[1]);
      expect(delays).toEqual(Array.from({ length: FILLED }, (_, k) => fillDelay(k)));
      expect(animated.match(/class="tm-r"/g)).toHaveLength(27 - FILLED);
      expect(animated.includes('class="tm-n"')).toBe(lockup !== 'mark');
      expect(animated.includes('class="tm-l"')).toBe(lockup.startsWith('tagline'));
    });
  }
});
