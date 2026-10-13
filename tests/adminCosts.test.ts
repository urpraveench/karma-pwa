import { describe, expect, it } from 'vitest';
import { LEVEL_TEXT, money, usedText } from '../src/admin/costs';

const row = { id: 'x', label: 'X', link: 'https://x', level: 'ok' as const };

describe('costs page (ADMIN-13)', () => {
  it('shows use against each limit, in MB for transfer', () => {
    expect(usedText({ ...row, unit: 'count', limit: 50_000, used: 1234 })).toBe('1,234 of 50,000 (2%)');
    expect(usedText({ ...row, unit: 'bytes', limit: 360 * 1024 * 1024, used: 120 * 1024 * 1024 })).toBe('120 MB of 360 MB (33%)');
    expect(usedText({ ...row, unit: 'count', limit: 100, used: 130 })).toBe('130 of 100 (130%)');
  });

  it('says each level in words and shows money in its currency', () => {
    expect(LEVEL_TEXT).toEqual({ ok: 'OK', amber: 'Over 70%', red: 'Over 90%' });
    expect(money(44.34, 'INR')).toBe('₹44.34');
  });
});
