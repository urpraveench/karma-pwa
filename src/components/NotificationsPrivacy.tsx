import { useState } from 'react';
import { analyticsAvailable, analyticsChoice, setConsent } from '../lib/analytics';
import { EMAIL_KINDS, emailOn } from '../lib/notifications';
import { useApp } from '../state/app';
import { BadgeRow, ReminderRow } from './Reminders';

function Toggle({ on, title, sub, onChange }: { on: boolean; title: string; sub: string; onChange: (on: boolean) => void }) {
  return (
    <button className="li" type="button" aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="t">{title}<small>{sub}</small></span>
      <span className={`switch${on ? ' on' : ''}`} aria-hidden="true"><i /></span>
    </button>
  );
}

/**
 * Setup › Notifications and privacy (NOTIF-01, NOTIF-12, ANA-03): the daily reminder, every email type and usage statistics, all on to start,
 * each off with one tap. Email choices live in the account, so the server respects them; statistics are per device.
 */
export function NotificationsPrivacy() {
  const { data, setEmailPref } = useApp();
  const [stats, setStats] = useState(analyticsChoice);
  return (
    <>
      <div className="sect-h"><h2>Notifications and privacy</h2></div>
      <div className="list">
        <ReminderRow />
        <BadgeRow />
        {EMAIL_KINDS.map(([kind, title, sub]) => (
          <Toggle key={kind} on={emailOn(data.settings, kind)} title={title} sub={`Email · ${sub}`} onChange={on => setEmailPref(kind, on)} />
        ))}
        {analyticsAvailable() && (
          <Toggle on={stats} title="Usage statistics" sub="Google Analytics: which screens and features get used. No names, emails or practice names."
            onChange={on => { setConsent(on ? 'granted' : 'denied'); setStats(on); }} />
        )}
      </div>
      <p className="hint" style={{ textAlign: 'left', margin: '-6px 2px 22px' }}>Every email also has an unsubscribe link. Emails about your account itself, such as password resets, always arrive.</p>
    </>
  );
}
