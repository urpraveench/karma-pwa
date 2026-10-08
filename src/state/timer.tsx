import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { calc } from '../lib/backlog';
import { today } from '../lib/date';
import { track } from '../lib/analytics';
import { count } from '../lib/stats';
import { chime, haptic, primeAudio } from '../lib/feedback';
import { elapsedMin, elapsedMs, fmtClock, loadTimer, saveTimer, type Timer } from '../lib/timer';
import type { Category } from '../lib/types';
import { useFeedback } from '../ui/feedback';
import { useApp } from './app';

function useTimerState() {
  const { data, getData, logEntry, openSheet, closeSheet, hideTip } = useApp();
  const { toast } = useFeedback();
  const [timer, setTimerState] = useState<Timer | null>(loadTimer);
  const [focusOpen, setFocusOpen] = useState(false);
  // Whole minutes elapsed: changes once a minute, which is all the Today screen needs.
  const [minute, setMinute] = useState(() => timer ? elapsedMin(timer) : 0);
  const timerRef = useRef(timer);
  const set = useCallback((v: Timer | null) => {
    timerRef.current = v; saveTimer(v); setTimerState(v);
    if (v) setMinute(elapsedMin(v)); else document.title = 'TikTym';
  }, []);
  const catOf = (tm: Timer | null): Category | undefined => tm ? getData().categories.find(x => x.id === tm.catId) : undefined;
  const cat = timer ? data.categories.find(x => x.id === timer.catId) : undefined;

  // Tab title, the minute counter, and the goal-reached alert.
  useEffect(() => {
    const tick = () => {
      const tm = timerRef.current;
      if (!tm) { document.title = 'TikTym'; return; }
      const c = getData().categories.find(x => x.id === tm.catId);
      if (!c) { set(null); return; }
      const ms = elapsedMs(tm);
      document.title = `${fmtClock(ms)} ${c.name}`;
      setMinute(Math.floor(ms / 60000));
      if (!tm.alerted && ms >= tm.goal * 60000) {
        set({ ...tm, alerted: true }); void chime(); haptic([30, 80, 30, 80, 60]);
        track('timer_target_reached', { goal_minutes: tm.goal }); count('timersReachedTarget');
        toast(`${c.name}: ${tm.goal} min target reached. Keep going or stop to log.`, 6000);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); document.title = 'TikTym'; };
  }, [getData, set, toast]);

  useEffect(() => {
    document.body.classList.toggle('has-timer', !!cat);
    return () => document.body.classList.remove('has-timer');
  }, [cat]);

  const openFocus = useCallback(() => { if (timerRef.current) setFocusOpen(true); }, []);
  const closeFocus = useCallback(() => setFocusOpen(false), []);

  const start = useCallback((catId: string, goalOverride?: number) => {
    const cur = timerRef.current, c = getData().categories.find(x => x.id === catId);
    if (!c) return;
    if (cur && cur.catId === catId) { setFocusOpen(true); return; }
    if (cur) {
      const other = catOf(cur), m = elapsedMin(cur);
      if (!confirm(`Stop the ${other?.name || ''} timer${m ? ` and log ${m} min` : ''}, then start ${c.name}?`)) return;
      set(null); if (m >= 1) logEntry(cur.catId, m, today(), '', 'timer');
    }
    const left = calc(getData(), today()).per[catId]?.today.end ?? 0;
    primeAudio(); haptic(12);
    set({ catId, startedAt: Date.now(), pausedMs: 0, pausedAt: null, goal: goalOverride || (left >= 5 ? Math.min(left, 120) : 25), alerted: false });
    hideTip(); closeSheet(); setFocusOpen(true);
    count('timersStarted');
  }, [getData, set, logEntry, hideTip, closeSheet]);

  const togglePause = useCallback(() => {
    const tm = timerRef.current; if (!tm) return;
    set(tm.pausedAt ? { ...tm, pausedMs: (tm.pausedMs || 0) + (Date.now() - tm.pausedAt), pausedAt: null } : { ...tm, pausedAt: Date.now() });
    haptic(8);
  }, [set]);

  const setGoal = useCallback((goal: number) => {
    const tm = timerRef.current; if (!tm) return;
    set({ ...tm, goal, alerted: elapsedMs(tm) >= goal * 60000 });
  }, [set]);

  const stop = useCallback(() => {
    const tm = timerRef.current; if (!tm) return;
    const ms = elapsedMs(tm), mins = Math.floor(ms / 60000);
    if (mins < 1) { set(null); setFocusOpen(false); toast('Under a minute, so nothing was logged'); return; }
    if (mins > 240 && !confirm(`The timer ran for ${fmtClock(ms)}. Log all ${mins} minutes?`)) {
      set(null); setFocusOpen(false); openSheet({ kind: 'log', catId: tm.catId, custom: true }); return;
    }
    set(null); setFocusOpen(false); logEntry(tm.catId, mins, today(), '', 'timer');
  }, [set, toast, openSheet, logEntry]);

  const discard = useCallback(() => {
    const tm = timerRef.current; if (!tm) return;
    const m = elapsedMin(tm);
    if (m >= 2 && !confirm(`Discard ${m} minutes without logging them?`)) return;
    set(null); setFocusOpen(false); toast('Timer discarded');
  }, [set, toast]);

  return { timer: cat ? timer : null, cat, minute, focusOpen: focusOpen && !!cat, openFocus, closeFocus, start, togglePause, setGoal, stop, discard };
}

export type TimerState = ReturnType<typeof useTimerState>;
const Ctx = createContext<TimerState | null>(null);
export const useTimer = () => useContext(Ctx)!;

export function TimerProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useTimerState()}>{children}</Ctx.Provider>;
}

/** Re-renders the caller every second; for clock displays only. */
export function useNow(active = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
