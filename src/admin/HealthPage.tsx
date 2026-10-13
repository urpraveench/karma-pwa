import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import type { HealthRow } from '../../functions/src/health';
import { functions } from './firebase';

// Each Cloud Function's runs and errors in the last 24 hours, errors first, with a link to its logs (ADMIN-14).

type Health = { status: 'ok'; rows: HealthRow[] } | { status: 'unavailable'; reason: string };
const n = (v: number) => v.toLocaleString('en-GB');

export function HealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    httpsCallable<void, Health>(functions, 'adminHealth', { timeout: 70_000 })()
      .then(r => setData(r.data))
      .catch(e => setError(`Couldn't load function health (${(e as { code?: string }).code || String(e)}).`));
  }, []);
  useEffect(load, [load]);

  const failing = data?.status === 'ok' ? data.rows.filter(r => r.errors > 0).length : 0;
  return (
    <>
      <div className="head"><h2>Function health</h2><button className="btn small" onClick={load}>Refresh</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p className="muted" aria-busy="true">Loading function health…</p>}
      {data?.status === 'unavailable' && (
        <p className="muted">Couldn't read Cloud Monitoring: {data.reason} The functions' service account needs the Monitoring Viewer role.</p>
      )}
      {data?.status === 'ok' && (
        <>
          <p className={failing ? 'summary bad' : 'summary'}>
            {failing ? `${failing} ${failing === 1 ? 'function had' : 'functions had'} errors in the last 24 hours.` : 'No errors in the last 24 hours.'}
          </p>
          {data.rows.length ? (
            <table className="health">
              <thead><tr><th>Function</th><th>Runs</th><th>Errors</th><th /></tr></thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.name} className={r.errors ? 'bad' : undefined}>
                    <td>{r.name}</td><td>{n(r.runs)}</td>
                    <td>{r.errors ? `${n(r.errors)} (${Math.round((r.errors / r.runs) * 100)}%)` : '0'}</td>
                    <td><a href={r.logs} target="_blank" rel="noreferrer">Logs</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">No function ran in the last 24 hours.</p>}
          <p className="muted small">Second-generation functions show under their Cloud Run service names, in lower case. Errors are runs that ended with a 4xx or 5xx response.</p>
        </>
      )}
    </>
  );
}
