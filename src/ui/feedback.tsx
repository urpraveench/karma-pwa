import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { haptic } from '../lib/feedback';
import { Mark } from './icons';
import type { Feel } from '../lib/types';

// One toast at a time (a new one replaces the old), plus the full-screen "All clear" celebration.

interface ToastState { id: number; msg: string; ms: number; undo?: () => void; rate?: (feel: Feel) => void }
interface CelebrateState { streak: number; undo: () => void; shield: boolean }

interface FeedbackApi {
  /** `rate` adds 😞 😐 🙂 buttons for how the session felt (LOG-31). */
  toast(msg: string, ms?: number, undo?: () => void, rate?: (feel: Feel) => void): void;
  /** `shield`: this clear day earned a streak shield (CALC-14). */
  celebrate(streak: number, undo: () => void, shield?: boolean): void;
}

const Ctx = createContext<FeedbackApi | null>(null);
export const useFeedback = () => useContext(Ctx)!;

const MILESTONES: Record<number, string> = { 7: 'A full week.', 21: '21 days. This is a habit now.', 30: 'A month without a gap.', 50: 'Fifty days.', 100: 'A hundred days.', 108: '108 days. A full mala.' };

const FEELS: [Feel, string, string][] = [[1, '😞', 'Felt low'], [2, '😐', 'Felt okay'], [3, '🙂', 'Felt good']];

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toastState, setToast] = useState<ToastState | null>(null);
  const [cel, setCel] = useState<CelebrateState | null>(null);
  const seq = useRef(0);

  const toast = useCallback((msg: string, ms = 2600, undo?: () => void, rate?: (feel: Feel) => void) => setToast({ id: ++seq.current, msg, ms, undo, rate }), []);
  const celebrate = useCallback((streak: number, undo: () => void, shield = false) => {
    haptic([15, 60, 15, 60, 40]); setToast(null); setCel({ streak, undo, shield });
  }, []);

  useEffect(() => {
    if (!toastState) return;
    const t = setTimeout(() => setToast(cur => cur?.id === toastState.id ? null : cur), toastState.ms);
    return () => clearTimeout(t);
  }, [toastState]);

  useEffect(() => {
    if (!cel) return;
    const t = setTimeout(() => setCel(null), 3200);
    return () => clearTimeout(t);
  }, [cel]);

  const api = useMemo(() => ({ toast, celebrate }), [toast, celebrate]);
  return (
    <Ctx.Provider value={api}>
      {children}
      {toastState && (
        <div className={`toast${toastState.rate ? ' rated' : ''}`} role="status" key={toastState.id}>
          <span>{toastState.msg}</span>
          {toastState.rate && <div className="feel" role="group" aria-label="How did it feel?">
            <small aria-hidden="true">How did it feel?</small>
            {FEELS.map(([v, face, label]) => <button key={v} type="button" aria-label={label} onClick={() => toastState.rate!(v)}>{face}</button>)}
          </div>}
          {toastState.undo && <button className="tundo" type="button" onClick={() => { setToast(null); toastState.undo!(); }}>Undo</button>}
        </div>
      )}
      {cel && (
        <div className="celebrate" role="status" onClick={e => { setCel(null); if ((e.target as HTMLElement).closest('button')) cel.undo(); }}>
          <div>
            <Mark className="cel-mark" filled={27} color="var(--gold)" />
            <span className="clear-word">All clear</span>
            <p>{cel.streak > 1 ? `${cel.streak}-day streak. ` : 'Nothing left today. '}{cel.shield ? 'You earned a shield: it keeps your streak if you miss a day.' : MILESTONES[cel.streak] || ''}</p>
            <button className="btn btn-2" type="button">Undo last entry</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
