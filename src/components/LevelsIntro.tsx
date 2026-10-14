import { useEffect, useRef } from 'react';
import { LEVEL_MAX, tierOf } from '../lib/levels';
import { introScreen } from '../lib/levelsIntro';
import { useApp } from '../state/app';

export const INTRO_KEY = 'tiktym:levels-intro';
export const IDEA_KEY = 'tiktym:idea-seen';
export const introSeen = () => { try { return !!localStorage.getItem(INTRO_KEY); } catch { return false; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

/** The levels introduction: one screen, once on this device, in place of that morning's splash (LVL-13). */
export function LevelsIntro({ onDone }: { onDone: () => void }) {
  const { c, data, T } = useApp();
  const lv = c.level!, n = lv.level;
  const s = introScreen(lv, !data.categories.some(x => x.startDate < lv.moves[0].date));
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => { write(INTRO_KEY, T); write(IDEA_KEY, T); }, [T]); // once, even if the app is closed before "Let's go"
  useEffect(() => { button.current?.focus(); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onDone]);

  return (
    <div className="splash intro" role="dialog" aria-modal="true" aria-label="Your level and your coach">
      <div className="splash-in">
        <div className="intro-ladder" role="img" aria-label={`Level ${n} of ${LEVEL_MAX}`}>
          {Array.from({ length: LEVEL_MAX }, (_, k) => <i key={k} className={k < n ? 'on' : ''} style={{ height: `${28 + k * 7}%` }} />)}
        </div>
        <p className="intro-level"><b>Level {n}</b> · {tierOf(n)}</p>
        <h2 className="intro-title">{s.title}</h2>
        {s.body.map((p, k) => <p key={k} className="intro-body">{p}</p>)}
        <button ref={button} className="btn" type="button" onClick={onDone}>Let's go</button>
      </div>
    </div>
  );
}
