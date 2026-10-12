import { useState } from 'react';
import { showInstallCard, type InstallNudge } from '../lib/install';
import { badgeOn, LOG_NUDGE_TIME, logNudgeOn, offerReminder, REMINDER_TIMES, reminderOn, reminderTime, timeLabel } from '../lib/reminders';
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
 * On Today, until this device allows notifications: "Want a reminder at 7 pm?" (NOTIF-12). Not while the install card is
 * showing; after "Not now", back in three days.
 */
export function ReminderCard() {
  const { data, T, enableReminders } = useApp();
  const { env } = useInstall();
  const status = usePushStatus();
  const [dismissed, setDismissed] = useState(() => read(CARD_KEY));
  const installing = showInstallCard({ env, hasLogged: data.logs.length > 0, nudge: installNudge(), today: T });
  if (status !== 'ask' || !offerReminder(dismissed, T) || installing) return null;
  const time = reminderTime(data.settings);
  const notNow = () => { write(CARD_KEY, T); setDismissed(T); };
  const allow = async () => { const s = await enableReminders(time); if (s !== 'ask') notNow(); };
  return (
    <section className="install-card" aria-label="Daily reminder">
      <div className="install-head">
        <h2>Want a reminder at {timeLabel(time)}?</h2>
        <button className="x" type="button" aria-label="Not now" onClick={notNow}><Icon.x /></button>
      </div>
      <p className="install-p">A notification at {timeLabel(time)}, only if something's still left that day. Tap Allow when your phone asks. You can change the time in Setup.</p>
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
        <span className="t">Daily reminder<small>{why ?? (status === 'ask' ? `Tap to allow notifications on this phone · at ${timeLabel(time)}` : `Push · at ${timeLabel(time)}, only if something's left that day`)}</small></span>
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

/** Setup › Evening log check (NOTIF-18): the 8 pm push, on by default, once this device can get notifications. */
export function LogNudgeRow() {
  const { data, enableReminders, setLogNudge } = useApp();
  const status = usePushStatus();
  const on = status === 'on' && logNudgeOn(data.settings);
  const why = status ? WHY[status] : undefined;
  const toggle = () => {
    if (status === 'ask') void enableReminders(reminderTime(data.settings)).then(s => { if (s === 'on') setLogNudge(true); });
    else if (status === 'on') setLogNudge(!on);
  };
  return (
    <button className="li" type="button" aria-pressed={on} disabled={!!why || !status} onClick={toggle}>
      <span className="t">Evening log check<small>{why ?? (status === 'ask' ? `Tap to allow notifications on this phone · at ${timeLabel(LOG_NUDGE_TIME)}` : `Push · at ${timeLabel(LOG_NUDGE_TIME)}, only if nothing's logged that day`)}</small></span>
      <span className={`switch${on ? ' on' : ''}`} aria-hidden="true"><i /></span>
    </button>
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
