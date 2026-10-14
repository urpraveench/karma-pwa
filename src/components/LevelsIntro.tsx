import { useEffect, useRef, useState } from 'react';
import { LEVEL_MAX, tierOf } from '../lib/levels';
import { introScreens } from '../lib/levelsIntro';
import { useApp } from '../state/app';

export const INTRO_KEY = 'tiktym:levels-intro';
export const IDEA_KEY = 'tiktym:idea-seen';
export const introSeen = () => { try { return !!localStorage.getItem(INTRO_KEY); } catch { return false; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

/** The levels introduction: three screens, once on this device, in place of that morning's splash (LVL-13). */
export function LevelsIntro({ onDone }: { onDone: () => void }) {
  const { c, data, T } = useApp();
  const lv = c.level!, n = lv.level;
  const fresh = !data.categories.some(x => x.startDate < lv.moves[0].date);
  const screens = introScreens(lv, c.rule, fresh);
  const [i, setI] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const last = i === screens.length - 1, s = screens[i];

  useEffect(() => { write(INTRO_KEY, T); write(IDEA_KEY, T); }, [T]); // once, even if the app is closed part-way
  useEffect(() => { button.current?.focus(); }, [i]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onDone]);

  return (
    <div className="splash intro" role="dialog" aria-modal="true" aria-label="How levels work">
      {!last && <button type="button" className="intro-skip" onClick={onDone}>Skip</button>}
      <div className="splash-in" key={i}>
        {i === 0 && (
          <div className="intro-ladder" role="img" aria-label={`Level ${n} of ${LEVEL_MAX}`}>
            {Array.from({ length: LEVEL_MAX }, (_, k) => <i key={k} className={k < n ? 'on' : ''} style={{ height: `${28 + k * 7}%` }} />)}
          </div>
        )}
        {i === 0 && <p className="intro-level"><b>Level {n}</b> · {tierOf(n)}</p>}
        <h2 className="intro-title">{s.title}</h2>
        {s.body.map((p, k) => <p key={k} className="intro-body">{p}</p>)}
        <div className="intro-dots" aria-hidden="true">{screens.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <button ref={button} className="btn" type="button" onClick={() => last ? onDone() : setI(i + 1)}>{last ? "Let's go" : 'Next'}</button>
      </div>
    </div>
  );
}
