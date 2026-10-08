import { describe, expect, it } from 'vitest';
import { addOwn, firstChoices, startingCategories, stepMinutes, SUGGESTIONS } from '../src/lib/firstRun';
import { defaultCategories } from '../src/lib/sample';
import { COLORS } from '../src/lib/util';

describe('choosing practices on first run', () => {
  it('offers eight suggestions with the four old defaults ticked (FIRST-01, FIRST-08)', () => {
    const cs = firstChoices();
    expect(cs).toHaveLength(SUGGESTIONS.length);
    expect(cs.filter(c => c.picked).map(c => `${c.name} ${c.minutes}`)).toEqual(['Exercise 30', 'Reading 30', 'Course study 30', 'Meditation 10']);
  });

  it('keeps the defaults used by Start over and sample data exactly as before (FIRST-01)', () => {
    const cats = defaultCategories('2026-10-07');
    expect(cats.map(c => [c.name, c.targets[0].minutes, c.color, c.order])).toEqual([
      ['Exercise', 30, COLORS[0], 0], ['Reading', 30, COLORS[1], 1], ['Course study', 30, COLORS[2], 2], ['Meditation', 10, COLORS[3], 3],
    ]);
    expect(cats[0].targets[0]).toEqual({ from: '2026-10-07', minutes: 30, days: [0, 1, 2, 3, 4, 5, 6] });
  });

  it('creates the picked practices in the order shown, every day from the start, each in the next colour (FIRST-08)', () => {
    const cats = startingCategories([{ name: 'Reading', minutes: 40 }, { name: 'Guitar', minutes: 20 }], '2026-10-07');
    expect(cats.map(c => [c.name, c.order, c.color, c.startDate, c.archivedFrom])).toEqual([['Reading', 0, COLORS[0], '2026-10-07', null], ['Guitar', 1, COLORS[1], '2026-10-07', null]]);
    expect(new Set(cats.map(c => c.id)).size).toBe(2);
  });

  it('changes minutes by the step, between 5 and 240 (FIRST-09)', () => {
    let cs = firstChoices();
    cs = stepMinutes(cs, 3, -5); expect(cs[3].minutes).toBe(5);
    cs = stepMinutes(cs, 3, -5); expect(cs[3].minutes).toBe(5);
    cs = stepMinutes(cs, 1, 500); expect(cs[1].minutes).toBe(240);
  });

  it('adds your own ticked at 20 minutes, or ticks a matching suggestion instead (FIRST-10)', () => {
    let cs = addOwn(firstChoices(), '  Guitar  ');
    expect(cs.at(-1)).toEqual({ name: 'Guitar', minutes: 20, picked: true });
    cs = addOwn(cs, 'walking');
    expect(cs.filter(c => c.name === 'Walking')).toEqual([{ name: 'Walking', minutes: 20, picked: true }]);
    expect(addOwn(cs, 'GUITAR')).toHaveLength(cs.length);
    expect(addOwn(cs, '   ')).toBe(cs);
    expect(addOwn(cs, 'x'.repeat(60)).at(-1)!.name).toHaveLength(40);
  });
});
