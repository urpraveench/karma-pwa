import type { DateStr } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date): DateStr => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: DateStr) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: DateStr, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());

export const fmtLong = (s: DateStr) => parse(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtShort = (s: DateStr) => parse(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const monthName = (d: DateStr) => parse(d).toLocaleDateString(undefined, { month: 'long' });
/** "7 am", "7 pm": the way TikTym writes times. (The browser's own format gave "07" in British English.) */
export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

export const dayLabel = (d: DateStr, T: DateStr = today()) => d === T ? 'today' : d === addDays(T, -1) ? 'yesterday' : fmtShort(d);
