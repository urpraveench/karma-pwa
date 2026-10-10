import { describe, expect, it } from 'vitest';
import { EMAIL_KINDS, emailOn } from '../src/lib/notifications';

describe('notification settings (NOTIF-01)', () => {
  it('every email type is on unless turned off', () => {
    for (const [kind] of EMAIL_KINDS) {
      expect(emailOn({}, kind)).toBe(true);
      expect(emailOn({ emails: { [kind]: true } }, kind)).toBe(true);
      expect(emailOn({ emails: { [kind]: false } }, kind)).toBe(false);
    }
    expect(emailOn({ emails: { recap: false } }, 'tips')).toBe(true); // only the one turned off
  });
});
