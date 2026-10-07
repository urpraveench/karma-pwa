import type { CSSProperties } from 'react';
import { fmtShort } from '../lib/date';
import { sum } from '../lib/util';
import type { Log } from '../lib/types';
import { useApp } from '../state/app';
import { Icon } from '../ui/icons';

const DELETED = { name: 'Deleted practice', color: 'var(--line)' };

export function History() {
  const { data, T, deleteLog } = useApp();
  const catMap = new Map(data.categories.map(c => [c.id, c]));
  const byDate: Record<string, Log[]> = {};
  for (const l of data.logs) (byDate[l.date] ||= []).push(l);
  const dates = Object.keys(byDate).sort().reverse().slice(0, 60);

  if (!dates.length) return (
    <>
      <header className="top"><div><h1 className="hello">History</h1></div></header>
      <div className="empty">Nothing logged yet. Tap the + button to log your first minutes.</div>
    </>
  );
  return (
    <>
      <header className="top"><div><p className="date">Every entry, newest first</p><h1 className="hello">History</h1></div></header>
      {dates.map(d => {
        const ls = [...byDate[d]].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return (
          <div key={d}>
            <div className="day-h"><span>{d === T ? 'Today' : fmtShort(d)}</span><small>{sum(ls.map(l => l.minutes))} points</small></div>
            {ls.map(l => {
              const cat = catMap.get(l.catId) || DELETED;
              return (
                <div className="log" key={l.id} style={{ '--c': cat.color } as CSSProperties}>
                  <i />
                  <span className="n">{cat.name}{l.note && <span className="note">{l.note}</span>}</span>
                  <b>{l.minutes}</b>
                  <button className="x" onClick={() => deleteLog(l.id)} aria-label="Delete entry"><Icon.x /></button>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
