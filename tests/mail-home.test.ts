import { describe, expect, it } from 'vitest';
import { comebackEmail, HOME_HINT, nudgeEmail, oneTapEmail, recapEmail, unsubscribeLink, welcomeEmail } from '../functions/src/mail';
import { weekRecap } from '../functions/src/recap';

// A link in an email can't open the home-screen app (never on iPhone, where the browser also doesn't share its sign-in),
// so every button but the welcome's points installed users to the icon (NOTIF-17).
const unsubscribe = unsubscribeLink('uid123', 'tips', 'secret');
const practice = { name: 'Meditation', minutes: 10, color: '#8A4FA3' };
const cat = { id: 'm', name: 'Meditation', color: '#8A4FA3', order: 0, startDate: '2026-09-01', archivedFrom: null, targets: [{ from: '2026-09-01', minutes: 10, days: [0, 1, 2, 3, 4, 5, 6] }] };
const recap = (logs: { catId: string; date: string; minutes: number }[]) => recapEmail({ name: 'Asha', recap: weekRecap([cat], logs, '2026-10-05')!, unsubscribe, easiest: 'Meditation' });

describe('emails point installed users to the home-screen icon (NOTIF-17)', () => {
  it('under the button and in the plain text, in the nudge, one-tap, comeback and both recaps', () => {
    for (const e of [
      nudgeEmail({ name: 'Asha', practice, unsubscribe }),
      oneTapEmail({ name: 'Asha', unsubscribe }),
      comebackEmail({ name: 'Asha', practice, days: 4, unsubscribe }),
      recap([{ catId: 'm', date: '2026-10-06', minutes: 10 }]),
      recap([{ catId: 'm', date: '2026-09-29', minutes: 10 }]), // a quiet week
    ]) {
      expect(e.html).toContain(`>${HOME_HINT}</p>`);
      expect(e.html.indexOf(HOME_HINT)).toBeGreaterThan(e.html.indexOf('utm_source=email')); // right after the button
      expect(e.text).toContain(HOME_HINT);
    }
  });

  it("not in the welcome: it's sent before anyone installs, and goes on to say how", () => {
    const e = welcomeEmail({ name: 'Asha', practices: [practice], unsubscribe });
    expect(e.html).not.toContain(HOME_HINT);
    expect(e.text).not.toContain(HOME_HINT);
    expect(e.html).toContain('Add it to your home screen');
  });

  it('says why: the sign-in', () => expect(HOME_HINT).toBe('Added TikTym to your home screen? Open it from there, so you stay signed in.'));
});
