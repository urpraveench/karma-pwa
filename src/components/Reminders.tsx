import { useState } from 'react';
import { showInstallCard, type InstallNudge } from '../lib/install';
import { badgeOn, nearestTime, REMINDER_TIMES, reminderOn, reminderTime, timeLabel } from '../lib/reminders';
import { useApp } from '../state/app';
import { useInstall } from '../state/install';
import { usePushStatus, type PushStatus } from '../state/push';
import { Icon } from '../ui/icons';

// Daily reminders in the app (NOTIF-12): the offer on Today, and the row in Setup › Notifications and privacy.

const CARD_KEY = 'tiktym:remind-card';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
const installNudge = (): InstallNudge => { try { return JSON.parse(localStorage.getItem('tiktym:install-nudge') || '') as InstallNudge; } catch { return { dismissals: 0 }; } };

/**
 * On Today, once something is logged today: "Remind me tomorrow at <this time>". Never on first open, never while the
 * install card is showing, and gone for good after "Not now" or a decision in the browser's prompt.
 */
export function ReminderCard() {
  const { data, T, now, enableReminders } = useApp();
  const { env } = useInstall();
  const status = usePushStatus();
  const [hidden, setHidden] = useState(() => read(CARD_KEY) === 'no');
  const loggedToday = data.logs.some(l => l.date === T && l.minutes > 0);
  const installing = showInstallCard({ env, hasLogged: data.logs.length > 0, nudge: installNudge(), today: T });
  if (status !== 'ask' || hidden || !loggedToday || installing) return null;
  const time = nearestTime(now);
  const notNow = () => { write(CARD_KEY, 'no'); setHidden(true); };
  const allow = async () => { const s = await enableReminders(time); if (s !== 'ask') notNow(); };
  return (
    <section className="install-card" aria-label="Daily reminder">
      <div className="install-head">
        <h2>Want a nudge tomorrow?</h2>
        <button className="x" type="button" aria-label="Not now" onClick={notNow}><Icon.x /></button>
      </div>
      <p className="install-p">A notification at {timeLabel(time)}, only if something's still left that day. You can change the time in Setup.</p>
      <div className="install-actions">
        <button className="btn" type="button" onClick={() => void allow()}>Remind me at {timeLabel(time)}</button>
        <button className="link" type="button" onClick={notNow}>Not now</button>
      </div>
    </section>
  );
}

const WHY: Partial<Record<PushStatus, string>> = {
  unsupported: "This browser can't show notifications.",
  'needs-install': 'On iPhone, reminders work once TikTym is on your home screen. Add it, open it from there, then turn this on.',
  blocked: "Notifications are blocked for TikTym. Allow them in your browser's site settings, then come back here.",
};

/** Setup › Daily reminder: the switch and the time, or why it can't work on this device. */
export function ReminderRow() {
  const { data, enableReminders, setReminder } = useApp();
  const status = usePushStatus();
  const time = reminderTime(data.settings), on = status === 'on' && reminderOn(data.settings);
  const why = status ? WHY[status] : undefined;
  const toggle = () => {
    if (status === 'ask') void enableReminders(time);
    else if (status === 'on') setReminder({ on: !on });
  };
  return (
    <>
      <button className="li" type="button" aria-pressed={on} disabled={!!why || !status} onClick={toggle}>
        <span className="t">Daily reminder<small>{why ?? `Push · at ${timeLabel(time)}, only if something's left that day`}</small></span>
        <span className={`switch${on ? ' on' : ''}`} aria-hidden="true"><i /></span>
      </button>
      {on && (
        <label className="li">
          <span className="t">Reminder time</span>
          <select className="time-pick" value={time} onChange={e => setReminder({ time: e.target.value })} aria-label="Reminder time">
            {REMINDER_TIMES.map(t => <option key={t} value={t}>{timeLabel(t)}</option>)}
          </select>
        </label>
      )}
    </>
  );
}

/** Setup › Show count on app icon (NOTIF-13), only where the device can show a number on TikTym's icon. */
export function BadgeRow() {
  const { data, setBadge } = useApp();
  if (!('setAppBadge' in navigator)) return null;
  const on = badgeOn(data.settings);
  return (
    <button className="li" type="button" aria-pressed={on} onClick={() => setBadge(!on)}>
      <span className="t">Show count on app icon<small>How many practices are left today, on TikTym's icon. On iPhone, once notifications are allowed</small></span>
      <span className={`switch${on ? ' on' : ''}`} aria-hidden="true"><i /></span>
    </button>
  );
}
