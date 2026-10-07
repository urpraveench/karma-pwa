import { pad } from './date';

// Timer state lives on this device, keyed to its start time, so closing the app doesn't lose it.

export interface Timer {
  catId: string;
  startedAt: number;
  pausedMs: number;
  pausedAt: number | null;
  /** Target in minutes. */
  goal: number;
  /** The goal-reached chime has fired. */
  alerted: boolean;
}

const KEY = 'tiktym:timer';

export const loadTimer = (): Timer | null => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
export const saveTimer = (v: Timer | null) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* storage full or blocked */ } };

export const elapsedMs = (tm: Timer, now = Date.now()) => Math.max(0, (tm.pausedAt || now) - tm.startedAt - (tm.pausedMs || 0));
export const elapsedMin = (tm: Timer, now = Date.now()) => Math.floor(elapsedMs(tm, now) / 60000);

export function fmtClock(ms: number): string {
  const x = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60);
  return h ? `${h}:${pad(m)}:${pad(x % 60)}` : `${m}:${pad(x % 60)}`;
}
