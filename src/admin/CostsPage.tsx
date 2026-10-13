import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { LEVEL_TEXT, money, usedText, type Costs } from './costs';

// This month's Google Cloud spend and how close each limit is (ADMIN-13). Each part says so on its own if it can't be
// read (billing export not set up, or a missing permission), with a link to the console that has it.

export function CostsPage() {
  const [data, setData] = useState<Costs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    httpsCallable<void, Costs>(functions, 'adminCosts', { timeout: 70_000 })()
      .then(r => setData(r.data))
      .catch(e => setError(`Couldn't load costs (${(e as { code?: string }).code || String(e)}).`));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <div className="head"><h2>Costs and limits</h2><button className="btn small" onClick={load}>Refresh</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p className="muted" aria-busy="true">Loading costs…</p>}
      {data && (
        <div className="costs">
          <section className="panel" aria-label="Google Cloud this month">
            <h3>Google Cloud this month</h3>
            {data.billing.status === 'ok' ? (
              <>
                <b className="total">{money(data.billing.total, data.billing.currency)}</b>
                <span className="muted small">After credits and discounts, from the billing export (it lags by a few hours)</span>
                {data.billing.services.length ? (
                  <table><tbody>
                    {data.billing.services.map(s => <tr key={s.service}><td>{s.service}</td><td>{money(s.cost, data.billing.status === 'ok' ? data.billing.currency : 'INR')}</td></tr>)}
                  </tbody></table>
                ) : <p className="muted">Nothing charged this month.</p>}
              </>
            ) : (
              <p className="muted">Couldn't read the billing export: {data.billing.reason} It's set up in Billing › Billing export (FOCUS or Standard usage cost, to BigQuery in this project).</p>
            )}
            <a href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer">Open Cloud Billing</a>
          </section>
          <section className="panel" aria-label="Limits">
            <h3>Limits</h3>
            <ul className="limits">
              {data.limits.map(l => (
                <li key={l.id} aria-label={l.label}>
                  <div className="line">
                    <b>{l.label}</b>
                    {l.level && <span className={`level ${l.level}`}>{LEVEL_TEXT[l.level]}</span>}
                  </div>
                  {l.used !== null ? (
                    <>
                      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={l.limit} aria-valuenow={l.used} aria-label={l.label}>
                        <span className={l.level ?? 'ok'} style={{ width: `${Math.min(100, (l.used / l.limit) * 100)}%` }} />
                      </div>
                      <span className="small">{usedText({ ...l, used: l.used })}</span>
                    </>
                  ) : <span className="small muted">Couldn't read: {l.error}</span>}
                  <a className="small" href={l.link} target="_blank" rel="noreferrer">Open console</a>
                </li>
              ))}
            </ul>
            <p className="muted small">Daily Firebase allowances reset at midnight Pacific time (about 12:30 to 1:30 pm in India); emails count India days.</p>
          </section>
        </div>
      )}
    </>
  );
}
