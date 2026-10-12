import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { audienceLabel, kindLabel, progress, when, type HistoryEntry } from './history';

// Every broadcast and test, newest first, with how far each has got (ADMIN-12). Refresh to follow one that's sending.

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    httpsCallable<void, { entries: HistoryEntry[] }>(functions, 'adminHistory')()
      .then(r => setEntries(r.data.entries))
      .catch(e => setError(`Couldn't load the history (${(e as { code?: string }).code || String(e)}).`));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <div className="head">
        <h2>History</h2>
        <button className="btn small" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!entries && !error && <p className="muted" aria-busy="true">Loading history…</p>}
      {entries?.length === 0 && <p className="muted">Nothing sent yet. Emails and pushes sent from this console appear here, tests included.</p>}
      {!!entries?.length && (
        <ul className="history">
          {entries.map(e => {
            const p = progress(e);
            return (
              <li key={e.id}>
                <div className="line">
                  <span className={`tag ${e.kind}`}>{kindLabel(e)}</span>
                  <b>{e.headline}</b>
                  <span className="muted">{when(e.at)} IST</span>
                </div>
                <div className="muted small">{audienceLabel(e)}</div>
                <div className={`small ${p.state}`}>{p.text}</div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
