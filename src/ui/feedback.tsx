import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { haptic } from '../lib/feedback';
import { Mark } from './icons';

// One toast at a time (a new one replaces the old), plus the full-screen "All clear" celebration.

interface ToastState { id: number; msg: string; ms: number; undo?: () => void }
interface CelebrateState { streak: number; undo: () => void }

interface FeedbackApi {
  toast(msg: string, ms?: number, undo?: () => void): void;
  celebrate(streak: number, undo: () => void): void;
}

const Ctx = createContext<FeedbackApi | null>(null);
export const useFeedback = () => useContext(Ctx)!;

const MILESTONES: Record<number, string> = { 3: 'Three days running.', 7: 'A full week.', 21: '21 days. This is a habit now.', 30: 'A month without a gap.', 50: 'Fifty days.', 100: 'A hundred days.', 108: '108 days. A full mala.' };

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toastState, setToast] = useState<ToastState | null>(null);
  const [cel, setCel] = useState<CelebrateState | null>(null);
  const seq = useRef(0);

  const toast = useCallback((msg: string, ms = 2600, undo?: () => void) => setToast({ id: ++seq.current, msg, ms, undo }), []);
  const celebrate = useCallback((streak: number, undo: () => void) => {
    haptic([15, 60, 15, 60, 40]); setToast(null); setCel({ streak, undo });
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
        <div className="toast" role="status" key={toastState.id}>
          <span>{toastState.msg}</span>
          {toastState.undo && <button className="tundo" type="button" onClick={() => { setToast(null); toastState.undo!(); }}>Undo</button>}
        </div>
      )}
      {cel && (
        <div className="celebrate" role="status" onClick={e => { setCel(null); if ((e.target as HTMLElement).closest('button')) cel.undo(); }}>
          <div>
            <Mark className="cel-mark" filled={27} color="var(--gold)" />
            <span className="clear-word">All clear</span>
            <p>{cel.streak > 1 ? `${cel.streak}-day streak. ` : 'Nothing left today. '}{MILESTONES[cel.streak] || ''}</p>
            <button className="btn btn-2" type="button">Undo last entry</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
