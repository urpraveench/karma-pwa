import { useState } from 'react';
import { analyticsAvailable, readConsent, setConsent } from '../lib/analytics';

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
