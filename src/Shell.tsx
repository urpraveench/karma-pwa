import { useEffect, type ComponentType } from 'react';
import { trackScreen } from './lib/analytics';
import { activeCats } from './lib/backlog';
import { Insights } from './screens/Insights';
import { History } from './screens/History';
import { Setup } from './screens/Setup';
import { Today } from './screens/Today';
import { CategorySheet } from './sheets/CategorySheet';
import { LogSheet } from './sheets/LogSheet';
import { useApp, type View } from './state/app';
import { useTimer } from './state/timer';
import { Focus } from './timer/Focus';
import { MiniPlayer } from './timer/MiniPlayer';
import { useFeedback } from './ui/feedback';
import { Icon } from './ui/icons';

const SCREENS: Record<View, ComponentType> = { today: Today, insights: Insights, history: History, setup: Setup };

function Tab({ v, label }: { v: View; label: string }) {
  const { view, setView } = useApp();
  const I = Icon[v];
  return <button className="tab" onClick={() => setView(v)} aria-current={view === v ? 'page' : undefined}><I /><span>{label}</span></button>;
}

/** The signed-in app: current screen, tab bar, mini-player, sheets and the focus timer. */
export function Shell() {
  const { view, sheet, data, T, openSheet, closeSheet } = useApp();
  const { focusOpen, closeFocus } = useTimer();
  const { toast } = useFeedback();
  const Screen = SCREENS[view];

  useEffect(() => { trackScreen(view); }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (focusOpen) closeFocus(); else closeSheet(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusOpen, closeFocus, closeSheet]);

  const openLog = () => {
    if (!activeCats(data.categories, T).length) { toast('Add a practice in Setup first'); return; }
    openSheet({ kind: 'log' });
  };

  return (
    <>
      <main className="app"><Screen /></main>
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-in">
          <Tab v="today" label="Today" />
          <Tab v="insights" label="Insights" />
          <button className="tab-log" onClick={openLog} aria-label="Log minutes"><Icon.plus /></button>
          <Tab v="history" label="History" />
          <Tab v="setup" label="Setup" />
        </div>
      </nav>
      <MiniPlayer />
      {sheet?.kind === 'log' && <LogSheet key={sheet.catId ?? ''} catId={sheet.catId} custom={sheet.custom} />}
      {sheet?.kind === 'editCat' && <CategorySheet key={sheet.id ?? 'new'} id={sheet.id} />}
      {focusOpen && <Focus />}
    </>
  );
}
