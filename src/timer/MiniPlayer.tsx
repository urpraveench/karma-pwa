import type { CSSProperties } from 'react';
import { elapsedMs, fmtClock } from '../lib/timer';
import { useNow, useTimer } from '../state/timer';
import { Icon } from '../ui/icons';

/** Stays above the tab bar on every tab while a timer runs. */
export function MiniPlayer() {
  const { timer: tm, cat, openFocus, togglePause, stop } = useTimer();
  const now = useNow(!!tm && !tm.pausedAt);
  if (!tm || !cat) return null;
  const ms = elapsedMs(tm, now);
  return (
    <div className={'mini' + (tm.pausedAt ? ' paused' : '')} style={{ '--c': cat.color } as CSSProperties}>
      <button className="mini-open" onClick={openFocus} aria-label="Open timer">
        <span className="pulse" />
        <span className="mini-t"><b>{fmtClock(ms)}</b><small>{cat.name}{tm.pausedAt ? ', paused' : ''}</small></span>
      </button>
      <button className="mini-btn" onClick={togglePause} aria-label={tm.pausedAt ? 'Resume' : 'Pause'}>{tm.pausedAt ? <Icon.play /> : <Icon.pause />}</button>
      <button className="mini-btn mini-stop" onClick={stop}>Stop</button>
      <span className="mini-prog" style={{ width: `${Math.min(100, ms / (tm.goal * 600))}%` }} />
    </div>
  );
}
