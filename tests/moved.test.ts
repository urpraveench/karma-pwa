import { describe, expect, it } from 'vitest';
import { moveAction, movedUrl } from '../src/lib/moved';

describe('moving to app.tiktym.com', () => {
  it('maps the old addresses to the same page on app.tiktym.com (GTM-08)', () => {
    expect(movedUrl('https://tiktym.web.app/')).toBe('https://app.tiktym.com/');
    expect(movedUrl('https://tiktym.firebaseapp.com/?ref=x#top')).toBe('https://app.tiktym.com/?ref=x#top');
    expect(movedUrl('https://tiktym.web.app/some/path?a=1&b=2#h')).toBe('https://app.tiktym.com/some/path?a=1&b=2#h');
  });

  it('leaves the new address, local servers and other sites alone (GTM-08)', () => {
    for (const href of ['https://app.tiktym.com/', 'http://localhost:4173/', 'http://127.0.0.1:5173/', 'https://tiktym.com/', 'https://evil.tiktym.web.app.example/'])
      expect(movedUrl(href)).toBeNull();
  });

  it('sends a browser tab on, and keeps an installed app with a bar (GTM-08, GTM-09)', () => {
    expect(moveAction('https://tiktym.web.app/x', false)).toEqual({ go: 'https://app.tiktym.com/x' });
    expect(moveAction('https://tiktym.web.app/x', true)).toBe('bar');
    expect(moveAction('https://app.tiktym.com/', true)).toBeNull();
    expect(moveAction('https://app.tiktym.com/', false)).toBeNull();
  });
});
