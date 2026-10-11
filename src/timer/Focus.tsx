import { useEffect, useState, type CSSProperties } from 'react';
import { elapsedMs, fmtClock } from '../lib/timer';
import { useApp } from '../state/app';
import { useNow, useTimer } from '../state/timer';
import { Icon } from '../ui/icons';

const R = 132, CX = 150, CY = 150, ARC_R = 112, C = 2 * Math.PI * ARC_R;
const STANDARD_GOALS = [15, 25, 45];

/** Keeps the screen awake while mounted, re-acquiring the lock when the app becomes visible again. */
function useWakeLock() {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    let lock: WakeLockSentinel | null = null, alive = true;
    const request = async () => {
      try {
        if (!('wakeLock' in navigator) || lock) return;
        lock = await navigator.wakeLock.request('screen');
        if (!alive) { void lock.release(); return; }
        setHeld(true);
        lock.addEventListener('release', () => { lock = null; if (alive) setHeld(false); });
      } catch { /* denied or unsupported */ }
    };
    const vis = () => { if (!document.hidden) void request(); };
    void request();
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); void lock?.release(); };
  }, []);
  return held;
}

/** Full-screen timer: one bead per target minute (up to 60), the clock, points so far and time to target. */
export function Focus() {
  const { c } = useApp();
  const { timer: tm, cat, closeFocus, togglePause, setGoal, stop, discard } = useTimer();
  const now = useNow(!!tm && !tm.pausedAt);
  const awake = useWakeLock();
  if (!tm || !cat) return null;

  const left = c.per[cat.id]?.today.end ?? 0;
  const ms = elapsedMs(tm, now), goalMs = tm.goal * 60000, pts = Math.floor(ms / 60000);
  const B = Math.min(tm.goal, 60), filled = Math.min(B, Math.floor(ms / (goalMs / B)));
  const goals = [...new Set([...STANDARD_GOALS, ...(left >= 5 && left <= 180 ? [left] : []), tm.goal])].sort((a, b) => a - b); // tm.goal: a started goal such as Just 7 (TODAY-18)
  const sub = tm.pausedAt ? 'Paused' : ms < goalMs ? `${Math.ceil((goalMs - ms) / 60000)} min to target` : `Target reached, ${pts - tm.goal} min extra`;

  return (
    <div className={'focus' + (tm.pausedAt ? ' paused' : '')} role="dialog" aria-label="Focus timer" style={{ '--c': cat.color } as CSSProperties}>
      <div className="f-top">
        <button className="f-min" onClick={closeFocus}><Icon.down />Minimise</button>
        <span className="f-wake">{awake ? 'Screen stays on' : ''}</span>
      </div>
      <div className="f-mid">
        <p className="f-name"><i />{cat.name}</p>
        <div className="f-ring">
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <circle cx="150" cy="150" r={ARC_R} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
            <circle className="f-arc" cx="150" cy="150" r={ARC_R} fill="none" stroke="var(--c)" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 150 150)"
              strokeDasharray={C.toFixed(1)} strokeDashoffset={(C * (1 - Math.min(1, ms / goalMs))).toFixed(1)} />
            {Array.from({ length: B }, (_, i) => {
              const a = (-90 + (i + .5) * 360 / B) * Math.PI / 180;
              return <circle key={i} cx={(CX + R * Math.cos(a)).toFixed(1)} cy={(CY + R * Math.sin(a)).toFixed(1)} r={B > 40 ? 4 : 5.5}
                fill={i < filled ? (ms >= goalMs ? 'var(--gold)' : 'var(--c)') : 'var(--line)'} />;
            })}
          </svg>
          <div className="f-center">
            <b>{fmtClock(ms)}</b>
            <span className="f-pts">{pts} point{pts === 1 ? '' : 's'} so far</span>
            <span className="f-sub">{sub}</span>
          </div>
        </div>
        <div className="f-goal" role="group" aria-label="Target">
          <span>Target</span>
          {goals.map(g => <button className="chip" key={g} onClick={() => setGoal(g)} aria-pressed={tm.goal === g}>{g}{g === left && !STANDARD_GOALS.includes(g) ? ' (all left)' : ''}</button>)}
        </div>
      </div>
      <div className="f-actions">
        <button className="btn f-stop" onClick={stop}>{pts >= 1 ? `Stop and log ${pts} min` : 'Stop'}</button>
        <div className="row2">
          <button className="btn btn-2" onClick={togglePause}>{tm.pausedAt ? 'Resume' : 'Pause'}</button>
          <button className="btn btn-2" onClick={discard}>Discard</button>
        </div>
      </div>
    </div>
  );
}
