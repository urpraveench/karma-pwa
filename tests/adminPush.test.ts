import { describe, expect, it } from 'vitest';
import { EMPTY_PUSH, pushDraftOf, pushProblem } from '../src/admin/push';

const full = { ...EMPTY_PUSH, title: ' Day 1 ', body: 'Log 5 minutes.' };

describe('push composer form (ADMIN-10)', () => {
  it('says what to fix first, mirroring the server', () => {
    expect(pushProblem(EMPTY_PUSH)).toBe('Write a title.');
    expect(pushProblem({ ...full, title: 'x'.repeat(61) })).toBe('Keep the title to 60 characters.');
    expect(pushProblem({ ...full, body: '' })).toBe('Write the text.');
    expect(pushProblem({ ...full, body: 'x'.repeat(161) })).toBe('Keep the text to 160 characters.');
    expect(pushProblem({ ...full, url: 'https://tiktym.com' })).toMatch(/path in the app/);
    expect(pushProblem({ ...full, url: '//x' })).toMatch(/path in the app/);
    expect(pushProblem({ ...full, url: '/?tab=insights' })).toBeNull();
    expect(pushProblem(full)).toBeNull();
  });

  it('sends a trimmed draft that opens Today unless a path is given', () => {
    expect(pushDraftOf(full)).toEqual({ audience: 'devices', title: 'Day 1', body: 'Log 5 minutes.', url: '/' });
    expect(pushDraftOf({ ...full, audience: 'active7', url: ' /x ' })).toMatchObject({ audience: 'active7', url: '/x' });
  });
});
