import { useState } from 'react';
import { config } from '../config';
import { analyticsAvailable, readConsent, setConsent, trackScreen } from '../lib/analytics';

/** Asks once whether to share anonymous usage stats. Nothing is sent before Allow (ANA-01). */
export function AnalyticsConsent() {
  const [consent, setLocal] = useState(readConsent);
  if (!analyticsAvailable() || consent !== null) return null;
  const choose = (c: 'granted' | 'denied') => {
    setConsent(c); setLocal(c);
    if (c === 'granted') trackScreen('today');
  };
  return (
    <section className="consent" aria-label="Usage statistics">
      <p><b>Help improve TikTym?</b> Share anonymous usage stats, such as which screens and features get used, with Google Analytics. No names, emails or practice names. <a href={config.legal.privacy}>Privacy Policy</a></p>
      <div className="row2">
        <button className="btn btn-2" type="button" onClick={() => choose('denied')}>No thanks</button>
        <button className="btn" type="button" onClick={() => choose('granted')}>Allow</button>
      </div>
    </section>
  );
}

/** Setup › Privacy: change the choice at any time (ANA-03). */
export function AnalyticsSwitch() {
  const [consent, setLocal] = useState(readConsent);
  if (!analyticsAvailable()) return null;
  const on = consent === 'granted';
  return (
    <>
      <div className="sect-h"><h2>Privacy</h2></div>
      <div className="list">
        <button className="li" type="button" aria-pressed={on} onClick={() => { const c = on ? 'denied' : 'granted'; setConsent(c); setLocal(c); }}>
          <span className="t">Share anonymous usage stats<small>Google Analytics: which screens and features get used. No names, emails or practice names.</small></span>
          <span className={`switch${on ? ' on' : ''}`} aria-hidden="true"><i /></span>
        </button>
      </div>
    </>
  );
}
