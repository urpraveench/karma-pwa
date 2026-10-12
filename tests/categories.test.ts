import { describe, expect, it } from 'vitest';
import { editCategory, moveCategory, newCategory, nextOrder, type CategoryForm } from '../src/lib/categories';
import type { Category } from '../src/lib/types';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const base: Category = { id: 'c', name: 'Reading', color: '#000', order: 0, startDate: '2026-09-01', archivedFrom: null, targets: [{ from: '2026-09-01', minutes: 30, days: EVERY_DAY }] };
const form = (o: Partial<CategoryForm> = {}): CategoryForm => ({ name: 'Reading', color: '#000', minutes: 30, days: EVERY_DAY, start: '2026-09-01', ...o });

describe('newCategory', () => {
  it('starts with one target from the start date, days sorted', () => {
    const c = newCategory(form({ days: [5, 1, 3] }), 4);
    expect(c).toMatchObject({ order: 4, startDate: '2026-09-01', archivedFrom: null, targets: [{ from: '2026-09-01', minutes: 30, days: [1, 3, 5] }] });
  });
});

describe('editCategory', () => {
  it('keeps the target history when only the name or colour changes', () => {
    const c = editCategory(base, form({ name: 'Books', color: '#fff' }), '2026-10-07');
    expect(c.name).toBe('Books');
    expect(c.targets).toEqual(base.targets);
  });

  it('applies a new target from today, leaving past days on the old one', () => {
    const c = editCategory(base, form({ minutes: 45 }), '2026-10-07');
    expect(c.targets).toEqual([{ from: '2026-09-01', minutes: 30, days: EVERY_DAY }, { from: '2026-10-07', minutes: 45, days: EVERY_DAY }]);
  });

  it('replaces a target set earlier the same day instead of stacking another', () => {
    const once = editCategory(base, form({ minutes: 45 }), '2026-10-07');
    const twice = editCategory(once, form({ minutes: 60 }), '2026-10-07');
    expect(twice.targets).toHaveLength(2);
    expect(twice.targets[1]).toEqual({ from: '2026-10-07', minutes: 60, days: EVERY_DAY });
  });

  it('moving the start date later drops targets that no longer apply', () => {
    const once = editCategory(base, form({ minutes: 45 }), '2026-10-07');
    const moved = editCategory(once, form({ minutes: 45, start: '2026-10-07' }), '2026-10-07');
    expect(moved.startDate).toBe('2026-10-07');
    expect(moved.targets).toEqual([{ from: '2026-10-07', minutes: 30, days: EVERY_DAY }]);
  });

  it('does not mutate the original', () => {
    editCategory(base, form({ minutes: 45 }), '2026-10-07');
    expect(base.targets).toHaveLength(1);
  });
});

describe('reordering', () => {
  const cat = (id: string, order: number): Category => ({ ...base, id, order });
  const ids = (cs: Category[]) => cs.map(c => `${c.id}${c.order}`);

  it('swaps a practice with its neighbour and returns only what changed (PRAC-22)', () => {
    const cats = [cat('a', 0), cat('b', 1), cat('c', 2)];
    expect(ids(moveCategory(cats, 'c', -1))).toEqual(['c1', 'b2']);
    expect(ids(moveCategory(cats, 'a', 1))).toEqual(['b0', 'a1']);
  });

  it('does nothing at either end, or for an unknown practice (PRAC-23)', () => {
    const cats = [cat('a', 0), cat('b', 1)];
    expect(moveCategory(cats, 'a', -1)).toEqual([]);
    expect(moveCategory(cats, 'b', 1)).toEqual([]);
    expect(moveCategory(cats, 'zz', 1)).toEqual([]);
  });

  it('tidies gaps and ties from older data while moving (PRAC-22)', () => {
    const cats = [cat('a', 0), cat('b', 4), cat('c', 4)];
    expect(ids(moveCategory(cats, 'c', -1))).toEqual(['c1', 'b2']);
  });

  it('puts a new practice after every existing one, even with gaps (PRAC-20)', () => {
    expect(nextOrder([])).toBe(0);
    expect(nextOrder([cat('a', 0), cat('b', 5)])).toBe(6);
  });
});

describe("a practice's own reminder time (PRAC-24)", () => {
  it('is saved only when set, and removed when turned off', () => {
    expect(newCategory(form({ remind: '10:00' }), 0).remind).toBe('10:00');
    expect('remind' in newCategory(form({ remind: null }), 0)).toBe(false);
    const set = editCategory(base, form({ remind: '16:00' }), '2026-10-07');
    expect(set.remind).toBe('16:00');
    expect(set.targets).toEqual(base.targets);
    expect('remind' in editCategory(set, form({ remind: null }), '2026-10-07')).toBe(false);
  });
});
