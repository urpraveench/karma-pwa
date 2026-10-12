import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { BarChart } from './BarChart';
import { functions } from './firebase';
import { fmt, metricTiles, shortDay, type Metrics } from './metrics';

// Usage at a glance (ADMIN-06): the nightly account totals as tiles, and 30 days of sign-ups, active loggers,
// entries and minutes as charts, all from the adminMetrics function.

const CHARTS = [
  { title: 'Sign-ups', value: (d: Metrics['days'][number]) => d.signUps, sum: true },
  { title: 'Active loggers, 7 days', value: (d: Metrics['days'][number]) => d.active7, sum: false },
  { title: 'Entries', value: (d: Metrics['days'][number]) => d.logs, sum: true },
  { title: 'Minutes logged', value: (d: Metrics['days'][number]) => d.minutes, sum: true },
];

export function MetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpsCallable<void, Metrics>(functions, 'adminMetrics')()
      .then(r => setData(r.data))
      .catch(e => setError(`Couldn't load the metrics (${(e as { code?: string }).code || String(e)}).`));
  }, []);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!data) return <p className="muted" aria-busy="true">Loading metrics…</p>;

  return (
    <>
      <div className="head">
        <h2>Metrics</h2>
        <span className="muted">{data.latest ? `Accounts as of ${shortDay(data.latest.day)}` : 'No nightly totals yet'}</span>
      </div>
      {data.latest ? (
        <div className="tiles">
          {metricTiles(data.latest, data.weekBefore).map(t => (
            <section className="tile" key={t.label} aria-label={t.label}>
              <span className="label">{t.label}</span>
              <b className="value">{t.value}</b>
              <span className="muted">{t.detail}</span>
              {t.change && <span className="change">{t.change}</span>}
            </section>
          ))}
        </div>
      ) : (
        <p className="muted">The account totals appear after the nightly job's first run, at 00:30 India time.</p>
      )}
      <div className="charts">
        {CHARTS.map(c => <BarChart key={c.title} title={c.title} days={data.days} value={c.value} sum={c.sum} />)}
      </div>
      <details className="table">
        <summary>Show the numbers as a table</summary>
        <table>
          <thead><tr><th>Day</th>{CHARTS.map(c => <th key={c.title}>{c.title}</th>)}</tr></thead>
          <tbody>
            {[...data.days].reverse().map(d => (
              <tr key={d.day}><td>{shortDay(d.day)}</td>{CHARTS.map(c => <td key={c.title}>{fmt(c.value(d))}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
