import { useState } from 'react';
import { fmt, niceMax, shortDay, type MetricsDay } from './metrics';

// One measure over 30 days: thin bars with rounded tops, a 2px gap, a recessive baseline and scale, and a tooltip
// for the day under the pointer (or keyboard focus). The page's table holds the same numbers.

const W = 600, H = 150, TOP = 8, BOTTOM = 22, GAP = 2;

/** `sum`: the caption totals the 30 days (sign-ups, entries); otherwise it shows the newest day (a rolling count). */
export function BarChart({ title, days, value, sum }: { title: string; days: MetricsDay[]; value: (d: MetricsDay) => number; sum: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = days.map(value), max = niceMax(values);
  const step = W / days.length, bw = step - GAP, plot = H - TOP - BOTTOM;
  const y = (v: number) => TOP + plot - (v / max) * plot;
  const bar = (v: number, x: number) => {
    const h = (v / max) * plot;
    if (h <= 0) return '';
    const r = Math.min(4, bw / 2, h), top = y(v), base = TOP + plot;
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${base}Z`;
  };
  const tip = hover === null ? null : { x: ((hover + 0.5) / days.length) * 100, day: days[hover].day, v: values[hover] };

  return (
    <figure className="chart">
      <figcaption>
        <b>{title}</b>
        <span className="muted">{sum ? `${fmt(values.reduce((a, b) => a + b, 0))} in 30 days` : `${fmt(values[values.length - 1])} on ${shortDay(days[days.length - 1].day)}`}</span>
      </figcaption>
      <div className="plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}, the last 30 days`} preserveAspectRatio="none">
          <line className="grid" x1={0} x2={W} y1={TOP} y2={TOP} />
          <line className="axis" x1={0} x2={W} y1={TOP + plot} y2={TOP + plot} />
          {values.map((v, i) => (
            <g key={days[i].day}>
              <path className={`bar${hover === i ? ' on' : ''}`} d={bar(v, i * step + GAP / 2)} />
              <rect className="hit" x={i * step} y={0} width={step} height={H} tabIndex={-1}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
            </g>
          ))}
        </svg>
        <span className="scale muted">{fmt(max)}</span>
        <span className="from muted">{shortDay(days[0].day)}</span>
        <span className="to muted">{shortDay(days[days.length - 1].day)}</span>
        {tip && (
          <div className={`tip${tip.x < 15 ? ' start' : tip.x > 85 ? ' end' : ''}`} role="status" style={{ left: `${tip.x}%` }}>
            <span className="muted">{shortDay(tip.day)}</span> <b>{fmt(tip.v)}</b>
          </div>
        )}
      </div>
    </figure>
  );
}
