import { describe, expect, it } from 'vitest';
import { EMAIL_KINDS, emailOn, NOTICE, needsNotice } from '../src/lib/notifications';

describe('notification settings (NOTIF-01, NOTIF-02)', () => {
  it('every email type is on unless turned off', () => {
    for (const [kind] of EMAIL_KINDS) {
      expect(emailOn({}, kind)).toBe(true);
      expect(emailOn({ emails: { [kind]: true } }, kind)).toBe(true);
      expect(emailOn({ emails: { [kind]: false } }, kind)).toBe(false);
    }
    expect(emailOn({ emails: { recap: false } }, 'tips')).toBe(true); // only the one turned off
  });

  it('only accounts from before the change need the notice, once', () => {
    expect(needsNotice({ seeded: true })).toBe(true);
    expect(needsNotice({ seeded: true, notice: NOTICE })).toBe(false);
    expect(needsNotice({ seeded: true, notice: '2025-01-01' })).toBe(true); // an older notice
    expect(needsNotice({})).toBe(false); // not set up yet: told at sign-up
  });
});
