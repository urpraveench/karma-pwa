import { useEffect, useRef, useState } from 'react';
import { fmtLong } from '../lib/date';
import { ideaFor, showIdeaSplash, SPLASH_MS } from '../lib/ideas';
import { useApp } from '../state/app';
import { Mark } from '../ui/icons';

const KEY = 'tiktym:idea-seen';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

/** Today's idea as a full-screen card on the first open of the day, then Today (TODAY-21). */
export function IdeaSplash() {
  const { data, T } = useApp();
  const [open, setOpen] = useState(() => showIdeaSplash(read(), T, data.categories));
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    write(T); // shown once a day, even if the app is closed before it is
    button.current?.focus();
    const t = setTimeout(() => setOpen(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, [open, T]);

  if (!open) return null;
  return (
    <div className="splash" role="dialog" aria-modal="true" aria-label="Today's idea" onClick={() => setOpen(false)}>
      <div className="splash-in">
        <Mark className="splash-mark" filled={27} color="var(--gold)" />
        <p className="splash-date">{fmtLong(T)}</p>
        <small>Today's idea</small>
        <p className="splash-idea">{ideaFor(T)}</p>
        <button ref={button} className="btn" type="button" onClick={() => setOpen(false)}>Start my day</button>
      </div>
      <i className="splash-bar" style={{ animationDuration: `${SPLASH_MS}ms` }} aria-hidden="true" />
    </div>
  );
}
