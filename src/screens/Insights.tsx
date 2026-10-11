import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { addDays, fmtShort, parse } from '../lib/date';
import { buildInsights, isClear, TOD_BUCKETS, type Insights as Data, type WeekStat } from '../lib/insights';
import { DAY_NAMES, sum, WD } from '../lib/util';
import { useApp } from '../state/app';

const W = 320;

const Head = ({ sub, onShare }: { sub: string; onShare?: () => void }) => (
  <header className="top">
    <div><p className="date">{sub}</p><h1 className="hello">Insights</h1></div>
    {onShare && <button className="chip share-btn" type="button" onClick={onShare}>Share</button>}
  </header>
);

function Delta({ s, unit = '' }: { s: WeekStat; unit?: string }) {
  if (s.prev === null) return <span className="delta flat">no data last week</span>;
  const d = s.value - s.prev;
  if (d === 0) return <span className="delta flat">same as last week</span>;
  return <span className={`delta ${d > 0 ? 'up' : 'down'}`}>{`${d > 0 ? '↑' : '↓'} ${Math.abs(d)}${unit} vs last week`}</span>;
}

export function Insights() {
  const { data, c, T, range, setRange, openSheet } = useApp();
  const ins = useMemo(() => buildInsights(data, c, T, range), [data, c, T, range]);
  if (!ins) return <><Head sub="Your patterns show up here" /><div className="empty">Log a couple of days and this page starts coaching you: what's slipping, what's improving, and how close your next milestone is.</div></>;
  const { week, coach } = ins;
  return (
    <>
      <Head sub={`Since ${fmtShort(ins.earliest)}`} onShare={() => openSheet({ kind: 'share' })} />
      <section className="coach" aria-label="What to do next">
        <h2>What to do next</h2>
        <ul>{coach.map((t, i) => <li key={i} style={{ '--tone': t.tone } as CSSProperties}><i /><span><b>{t.strong}</b>{t.rest}</span></li>)}</ul>
      </section>
      <div className="wk">
        <div><b>{week.points.value}</b><span className="l">points this week</span>{week.showDelta && <Delta s={week.points} />}</div>
        <div><b>{`${week.hit.value}%`}</b><span className="l">of target</span>{week.showDelta && <Delta s={week.hit} unit=" pts" />}</div>
        <div><b>{week.clear.value}</b><span className="l">{`clear day${week.clear.value === 1 ? '' : 's'}`}</span>{week.showDelta && <Delta s={week.clear} />}</div>
      </div>
      <section className="panel">
        <div className="panel-h"><h3>Consistency</h3><button type="button" className="panel-link" onClick={() => openSheet({ kind: 'streak' })}>{c.streak ? `${c.streak}-day streak, best ${c.best}` : `best streak ${c.best}`} ›</button></div>
        <p className="sub">The last 16 weeks. Don't let the chain break.</p>
        <Heatmap ins={ins} T={T} />
        <div className="hkey">Missed <i style={{ background: 'var(--due-soft)' }} /><i style={{ background: 'var(--ok)', opacity: .2 }} /><i style={{ background: 'var(--ok)', opacity: .42 }} /><i style={{ background: 'var(--ok)', opacity: .7 }} /><i style={{ background: 'var(--ok)' }} /> Cleared</div>
      </section>
      <Health ins={ins} />
      <Milestones ins={ins} best={c.best} />
      <Rhythm ins={ins} />
      <div className="sect-h detail-h"><h2>Daily detail</h2></div>
      <div className="seg" role="group" aria-label="Range">
        {[7, 30, 90].map(k => <button key={k} onClick={() => setRange(k)} aria-pressed={range === k}>{k} days</button>)}
      </div>
      <DailyCharts ins={ins} />
    </>
  );
}

function Heatmap({ ins, T }: { ins: Data; T: string }) {
  const WEEKS = 16, cell = 16, g = 3, left = 22, top = 14;
  const startMon = addDays(T, -(ins.dow + 7 * (WEEKS - 1)));
  const out: ReactNode[] = [];
  ['M', '', 'W', '', 'F', '', 'S'].forEach((l, i) => { if (l) out.push(<text key={'l' + i} x="0" y={top + i * (cell + g) + 12}>{l}</text>); });
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) for (let r = 0; r < 7; r++) {
    const d = addDays(startMon, w * 7 + r), x = left + w * (cell + g), y = top + r * (cell + g);
    if (r === 0) { const m = parse(d).getMonth(); if (m !== lastMonth) { lastMonth = m; out.push(<text key={'m' + d} x={x} y="9">{parse(d).toLocaleDateString(undefined, { month: 'short' })}</text>); } }
    if (d > T || d < ins.earliest) {
      if (d <= T) out.push(<rect key={d} x={x} y={y} width={cell} height={cell} rx="3.5" fill="var(--surface-2)" opacity=".35" />);
      continue;
    }
    const row = ins.day(d);
    let fill: string, op = 1, stroke: { stroke?: string; strokeWidth?: number } = {};
    if (!row.due && !row.done && !row.owed) { fill = 'transparent'; stroke = { stroke: 'var(--line)', strokeWidth: 1.5 }; }
    else if (isClear(row)) fill = 'var(--ok)';
    else {
      const q = row.due ? row.done / row.due : 0;
      if (d === T && q < 1) { fill = 'transparent'; stroke = { stroke: 'var(--ok)', strokeWidth: 2 }; }
      else if (q >= 1) { fill = 'var(--ok)'; op = .7; } else if (q >= .5) { fill = 'var(--ok)'; op = .42; } else if (q > 0) { fill = 'var(--ok)'; op = .2; } else fill = 'var(--due-soft)';
    }
    out.push(<rect key={d} x={x} y={y} width={cell} height={cell} rx="3.5" fill={fill} opacity={op} {...stroke}><title>{`${fmtShort(d)}: ${row.done} of ${row.due} points`}</title></rect>);
  }
  return <svg className="chart heat" viewBox={`0 0 ${left + WEEKS * (cell + g)} ${top + 7 * (cell + g)}`}>{out}</svg>;
}

function Health({ ins }: { ins: Data }) {
  return (
    <section className="panel">
      <div className="panel-h"><h3>Practice health</h3><small>last 14 days</small></div>
      <p className="sub">Solid is met, faded is partial, red is missed, outlined is a rest day.</p>
      {ins.health.map(p => {
        const tr = p.hr14 !== null && p.hrPrev !== null ? p.hr14 - p.hrPrev : null;
        return (
          <div className="ph" key={p.cat.id} style={{ '--c': p.cat.color } as CSSProperties}>
            <div className="ph-top">
              <span className="ph-name"><i />{p.cat.name}</span>
              {p.st ? <span className="ph-st">{`${p.st}-day streak`}</span> : <span className="ph-st zero">no streak yet</span>}
            </div>
            <div className="strip">{p.strip.map((x, i) => <i key={i} className={x} />)}</div>
            <div className="ph-meta">
              <span>{`${p.hr14 ?? 0}% of target`}{tr !== null && tr !== 0 && <>{' '}<span className={tr > 0 ? 'up' : 'down'}>{`${tr > 0 ? '↑' : '↓'}${Math.abs(tr)}`}</span></>}</span>
              <span>{`${(p.total / 60).toFixed(p.total >= 600 ? 0 : 1)} h total`}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Milestones({ ins, best }: { ins: Data; best: number }) {
  const { streak, hours, bestDay, clearDays } = ins.milestones;
  const pc = (v: number, a: number, b: number) => Math.max(3, Math.min(100, (v - a) / (b - a) * 100));
  const stLeft = streak.next - streak.value;
  return (
    <section className="panel">
      <div className="panel-h"><h3>Next milestones</h3></div>
      <p className="sub">Effort climbs as the finish line gets close. Here's how close.</p>
      <div className="ms"><div className="ms-top"><b>{`${streak.next}-day streak`}</b><span>{`${stLeft} clear day${stLeft === 1 ? '' : 's'} to go`}</span></div><div className="bar"><i style={{ width: `${pc(streak.value, streak.prev, streak.next)}%` }} /></div></div>
      <div className="ms"><div className="ms-top"><b>{`${hours.next} hours of practice`}</b><span>{`${Math.ceil((hours.next - hours.value) * 60)} points to go`}</span></div><div className="bar"><i style={{ width: `${pc(hours.value, hours.prev, hours.next)}%` }} /></div></div>
      <div className="recs">
        <div><b>{`${hours.value >= 10 ? Math.round(hours.value) : hours.value.toFixed(1)} h`}</b><span>{`practised since ${fmtShort(ins.earliest)}`}</span></div>
        <div><b>{best}</b><span>longest streak</span></div>
        <div><b>{bestDay.done}</b><span>{`best day${bestDay.done ? `, ${fmtShort(bestDay.d)}` : ''}`}</span></div>
        <div><b>{clearDays}</b><span>days ended clear</span></div>
      </div>
    </section>
  );
}

function Rhythm({ ins }: { ins: Data }) {
  const { hit, weakest, strongest } = ins.weekday;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const todSum = sum(ins.tod), topB = todSum ? ins.tod.indexOf(Math.max(...ins.tod)) : -1;
  return (
    <section className="panel">
      <h3>Your rhythm</h3>
      <p className="sub">{weakest && strongest ? `Strongest on ${DAY_NAMES[strongest[1]]}s, weakest on ${DAY_NAMES[weakest[1]]}s.` : 'Share of target met by weekday, last 8 weeks.'}</p>
      <svg className="chart" viewBox={`0 0 ${W} 104`}>
        {order.map((k, i) => {
          const bw = 32, x = i * (W - bw) / 6, v = hit[k], h = v === null ? 0 : v / 100 * 68;
          const col = weakest && k === weakest[1] ? 'var(--due)' : strongest && k === strongest[1] ? 'var(--ok)' : 'var(--ink)';
          return (
            <g key={k}>
              <rect x={x} y={74 - Math.max(h, 2)} width={bw} height={Math.max(h, 2)} rx="6" fill={col} opacity={col === 'var(--ink)' ? .55 : 1} />
              <text x={x + bw / 2} y={70 - h} textAnchor="middle" style={{ fontWeight: 700 }}>{v === null ? '' : v + '%'}</text>
              <text x={x + bw / 2} y="94" textAnchor="middle">{DAY_NAMES[k].slice(0, 3)}</text>
            </g>
          );
        })}
      </svg>
      {todSum > 0 && <>
        <h3 style={{ marginTop: 14 }}>When you log</h3>
        <p className="sub">{`${['Mostly mornings', 'Mostly afternoons', 'Mostly evenings', 'Mostly late at night'][topB]}, by when entries were saved in the last 30 days.`}</p>
        <div className="tod">{ins.tod.map((v, i) => v ? <i key={i} style={{ width: `${v / todSum * 100}%`, background: TOD_BUCKETS[i][3], color: TOD_BUCKETS[i][4] }}>{v / todSum >= .14 ? Math.round(v / todSum * 100) + '%' : ''}</i> : null)}</div>
        <div className="tod-key">{TOD_BUCKETS.map(b => <span key={b[0]} style={{ '--k': b[3] } as CSSProperties}>{b[0]}</span>)}</div>
      </>}
    </section>
  );
}

function DailyCharts({ ins }: { ins: Data }) {
  const rows = ins.detail, n = rows.length;
  const gap = n > 40 ? 1 : n > 10 ? 2 : 6, bw = (W - gap * (n - 1)) / Math.max(1, n), H = 140;
  const yMax = Math.max(10, ...rows.map(r => Math.max(r.done, r.due))) * 1.08, y = (v: number) => H - v / yMax * H;
  const bMax = Math.max(10, ...rows.map(r => r.end)), LH = 80;
  const line = rows.map((r, i) => `${(n === 1 ? W / 2 : i / (n - 1) * W).toFixed(1)},${(LH - r.end / bMax * LH).toFixed(1)}`).join(' ');
  return (
    <>
      <section className="panel">
        <h3>Daily points</h3>
        <p className="sub">Coloured by practice. The dark tick is that day's target.</p>
        <svg className="chart" viewBox={`0 -6 ${W} ${H + 24}`}>
          {rows.map((r, i) => {
            const x = i * (bw + gap); let acc = 0;
            const lab = n <= 7 ? WD[parse(r.d).getDay()] : (i % (n > 40 ? 15 : 5) === 0 || i === n - 1 ? String(parse(r.d).getDate()) : '');
            return (
              <g key={r.d}>
                {ins.cats.map(cat => {
                  const v = r.byCat[cat.id] || 0; if (!v) return null;
                  const el = <rect key={cat.id} x={x.toFixed(1)} y={y(acc + v).toFixed(1)} width={bw.toFixed(1)} height={(v / yMax * H).toFixed(1)} fill={cat.color} />;
                  acc += v; return el;
                })}
                {r.due > 0 && <rect x={(x - 1).toFixed(1)} y={(y(r.due) - 1).toFixed(1)} width={(bw + 2).toFixed(1)} height="2.5" rx="1" fill="var(--ink)" />}
                {lab && <text x={(x + bw / 2).toFixed(1)} y={H + 15} textAnchor="middle">{lab}</text>}
              </g>
            );
          })}
        </svg>
      </section>
      <section className="panel">
        <h3>Backlog</h3>
        <p className="sub">Points still owed at the end of each day.</p>
        <svg className="chart" viewBox={`0 -4 ${W} ${LH + 8}`}>
          <polygon points={`0,${LH} ${line} ${W},${LH}`} fill="var(--due-soft)" />
          <polyline points={line} fill="none" stroke="var(--due)" strokeWidth="2.2" strokeLinejoin="round" />
          <text x="0" y="8">{bMax}</text>
        </svg>
      </section>
    </>
  );
}
