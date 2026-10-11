import { describe, expect, it } from 'vitest';
import { waveLevels } from '../src/lib/voiceCapture';

describe('the recording wave (LOG-26)', () => {
  it('moves even in silence, so recording looks alive', () => {
    const a = waveLevels(0, 17, 0);
    const b = waveLevels(0, 17, 400);
    expect(a).toHaveLength(17);
    expect(a).not.toEqual(b);
    expect(Math.max(...a)).toBeGreaterThan(0.15);
  });

  it('grows when the voice is louder, tallest in the middle', () => {
    const quiet = waveLevels(0, 17, 0);
    const loud = waveLevels(1, 17, 0);
    expect(Math.max(...loud)).toBeGreaterThan(Math.max(...quiet) * 2);
    const middle = waveLevels(1, 17, 0).map((_, i) => Math.max(...[0, 300, 600, 900].map(t => waveLevels(1, 17, t)[i])));
    expect(middle[8]).toBeGreaterThan(middle[0]);
    expect(middle[8]).toBeGreaterThan(middle[16]);
  });

  it('stays within the bar limits for any input', () => {
    for (const loudness of [-1, 0, 0.5, 1, 5]) {
      for (const level of waveLevels(loudness, 17, 1234)) {
        expect(level).toBeGreaterThanOrEqual(0.08);
        expect(level).toBeLessThanOrEqual(1);
      }
    }
  });
});
