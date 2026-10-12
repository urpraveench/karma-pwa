import { describe, expect, it } from 'vitest';
import { OFFLINE, startErrorMessage } from '../src/lib/startError';

describe('start errors', () => {
  it('says TikTym couldn\'t finish loading, with no developer hints (AUTH-22)', () => {
    const msg = startErrorMessage('start', true);
    expect(msg).toBe('TikTym couldn\'t finish loading. Check your connection, then tap Reload.');
    expect(msg).not.toMatch(/env|Firebase|Firestore|rules/i);
  });

  it('says the practices couldn\'t load, with no developer hints (FIRST-04)', () => {
    const msg = startErrorMessage('data', true);
    expect(msg).toBe('Couldn\'t load your practices. Check your connection, then tap Reload.');
    expect(msg).not.toMatch(/env|Firebase|Firestore|rules/i);
  });

  it('says offline when the device is offline (AUTH-22, FIRST-04)', () => {
    expect(startErrorMessage('start', false)).toBe(OFFLINE);
    expect(startErrorMessage('data', false)).toBe('You\'re offline. Connect to the internet, then tap Reload.');
  });
});
