import type { Calc } from '../lib/backlog';
import { sum } from '../lib/util';
import type { Category } from '../lib/types';

const N = 108, R = 128, CX = 150, CY = 150;

/**
 * 108 beads for today's total owed. Beads fill in each practice's colour by minutes done,
 * then a pulsing run for the live timer, then red for carried-over minutes still owed.
 */
export function malaFills(c: Calc, cats: Category[], live?: { color: string; minutes: number }): string[] {
  const owed = c.totals.owed, fills: string[] = [];
  if (owed <= 0) return fills;
  const parts = cats.map(cat => { const r = c.per[cat.id].today; return { color: cat.color, v: Math.min(r.done, r.owed) / owed * N }; });
  const base = parts.map(p => Math.floor(p.v));
  let rem = Math.round(sum(parts.map(p => p.v))) - sum(base);
  // largest remainders get the leftover beads
  parts.map((p, i) => [p.v - base[i], i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { base[i]++; rem--; } });
  base.forEach((n, i) => { for (let k = 0; k < n; k++) fills.push(parts[i].color); });
  if (live) {
    const liveB = Math.min(N - fills.length, Math.round(live.minutes / owed * N));
    for (let k = 0; k < liveB; k++) fills.push('live:' + live.color);
  }
  const carryB = Math.min(N - fills.length, Math.round(c.totals.carryLeft / owed * N));
  for (let k = 0; k < carryB; k++) fills.push('var(--due)');
  return fills;
}

export function Mala({ fills }: { fills: string[] }) {
  return (
    <svg viewBox="0 0 300 300" role="img" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => {
        const a = (-90 + (i + 1) * 360 / (N + 1)) * Math.PI / 180;
        const raw = fills[i] || 'var(--line)', isLive = raw.startsWith('live:');
        return <circle key={i} className={'bd' + (isLive ? ' live' : '')} cx={(CX + R * Math.cos(a)).toFixed(2)} cy={(CY + R * Math.sin(a)).toFixed(2)} r="3.3"
          fill={isLive ? raw.slice(5) : raw} style={{ animationDelay: `${i * 7}ms` }} />;
      })}
      <circle cx={CX} cy={CY - R} r="6.5" fill="var(--gold)" />
      <path d={`M${CX} ${CY - R + 6} l0 14`} stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
