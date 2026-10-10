import { needsNotice } from '../lib/notifications';
import { useApp } from '../state/app';

/**
 * Once, on Today, for accounts from before emails and statistics were on by default (NOTIF-02). The Privacy Policy
 * promises to tell people in the app before significant changes take effect; statistics start only once it's seen.
 */
export function PolicyNotice() {
  const { data, dismissNotice, setView } = useApp();
  if (!needsNotice(data.settings)) return null;
  return (
    <section className="notice" aria-label="What's changed">
      <h2>Emails and usage statistics</h2>
      <p>TikTym now sends a few emails about your practice, such as a weekly recap and occasional news, and counts usage statistics to see what helps. They're on from now; you can turn any of them off in Setup › Notifications and privacy, or from any email.</p>
      <div className="row2">
        <button className="btn btn-2" type="button" onClick={() => { dismissNotice(); setView('setup'); }}>Review settings</button>
        <button className="btn" type="button" onClick={dismissNotice}>OK</button>
      </div>
    </section>
  );
}
