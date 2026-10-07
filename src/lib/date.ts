import type { DateStr } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date): DateStr => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: DateStr) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: DateStr, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());

export const fmtLong = (s: DateStr) => parse(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtShort = (s: DateStr) => parse(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const monthName = (d: DateStr) => parse(d).toLocaleDateString(undefined, { month: 'long' });
export const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' });

/** The last `n` days ending at `end`, oldest first. */
export function lastN(n: number, end: DateStr = today()): DateStr[] {
  const out: DateStr[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}
