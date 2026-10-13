import { badgeOn, LOG_NUDGE_TIME, logNudgeOn, REMINDER_TIMES, reminderOn, reminderTime, timeLabel } from '../lib/reminders';
import { useApp } from '../state/app';
import { BLOCKED_HELP, usePushStatus, type PushStatus } from '../state/push';

// Daily reminders in Setup › Notifications and privacy (NOTIF-12). The reminder and the evening log check are on by
// default in every account; the phone's own "Allow" is asked on the first tap in the app (state/app.tsx).

export const WHY: Partial<Record<PushStatus, string>> = {
  unsupported: "This browser can't show notifications.",
  'needs-install': 'On iPhone, reminders work once TikTym is on your home screen. Add it, open it from there, then turn this on.',
  blocked: BLOCKED_HELP.setup,
};

/** Setup › Daily reminder: the switch and the time, or why it can't work on this device. */
export function ReminderRow() {
  const { data, enableReminders, setReminder } = useApp();
  const status = usePushStatus();
  const time = reminderTime(data.settings), on = reminderOn(data.settings); // the account's setting: on by default
  const why = status ? WHY[status] : undefined;
  const toggle = () => {
    if (!on && status === 'ask') void enableReminders(time);
    else setReminder({ on: !on });
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

/** Setup › Evening log check (NOTIF-18): the 8 pm push, on by default. */
export function LogNudgeRow() {
  const { data, enableReminders, setLogNudge } = useApp();
  const status = usePushStatus();
  const on = logNudgeOn(data.settings); // the account's setting: on by default
  const why = status ? WHY[status] : undefined;
  const toggle = () => {
    if (!on && status === 'ask') void enableReminders(reminderTime(data.settings));
    setLogNudge(!on);
  };
  return (
    <button className="li" type="button" aria-pressed={on} disabled={!!why || !status} onClick={toggle}>
      <span className="t">Evening log check<small>{why ?? `Push · at ${timeLabel(LOG_NUDGE_TIME)}, only if nothing's logged that day`}</small></span>
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
