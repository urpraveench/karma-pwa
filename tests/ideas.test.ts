import { describe, expect, it } from 'vitest';
import { IDEAS, ideaFor } from '../src/lib/ideas';

describe("Today's idea (TODAY-19)", () => {
  it('one idea a day, a different one tomorrow, every one used in turn', () => {
    expect(ideaFor('2026-10-07')).toBe(ideaFor('2026-10-07'));
    expect(ideaFor('2026-10-08')).not.toBe(ideaFor('2026-10-07'));
    const seen = new Set(Array.from({ length: IDEAS.length }, (_, i) => ideaFor(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10))));
    expect(seen.size).toBe(IDEAS.length);
  });

  it('every idea is short and unique', () => {
    expect(new Set(IDEAS).size).toBe(IDEAS.length);
    for (const idea of IDEAS) expect(idea.length, idea).toBeLessThanOrEqual(120);
  });
});
