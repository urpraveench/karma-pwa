import { useEffect, useRef, type ComponentType } from 'react';
import { trackScreen } from './lib/analytics';
import { activeCats } from './lib/backlog';
import { Insights } from './screens/Insights';
import { History } from './screens/History';
import { Setup } from './screens/Setup';
import { Today } from './screens/Today';
import { CategorySheet } from './sheets/CategorySheet';
import { EditLogSheet } from './sheets/EditLogSheet';
import { LogSheet } from './sheets/LogSheet';
import { InstallSheet } from './sheets/InstallSheet';
import { ShareSheet } from './sheets/ShareSheet';
import { useApp, type View } from './state/app';
import { useTimer } from './state/timer';
import { Focus } from './timer/Focus';
import { MiniPlayer } from './timer/MiniPlayer';
import { useFeedback } from './ui/feedback';
import { Icon } from './ui/icons';
import { beginVoiceCapture, type VoiceCapture } from './lib/voiceCapture';

const SCREENS: Record<View, ComponentType> = { today: Today, insights: Insights, history: History, setup: Setup };

function Tab({ v, label }: { v: View; label: string }) {
  const { view, setView } = useApp();
  const I = Icon[v];
  return <button className="tab" onClick={() => setView(v)} aria-current={view === v ? 'page' : undefined}><I /><span>{label}</span></button>;
}

/** The signed-in app: current screen, tab bar, mini-player, sheets and the focus timer. */
export function Shell() {
  const { view, sheet, data, T, openSheet } = useApp();
  const { focusOpen, closeFocus } = useTimer();
  const { toast } = useFeedback();
  const Screen = SCREENS[view];
  const voiceCapture = useRef<VoiceCapture | null>(null);

  useEffect(() => { trackScreen(view); }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && focusOpen && !sheet) closeFocus(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusOpen, closeFocus, sheet]);

  useEffect(() => {
    if (sheet?.kind === 'log' && sheet.voice) return;
    voiceCapture.current?.cancel();
    voiceCapture.current = null;
  }, [sheet]);

  useEffect(() => () => { voiceCapture.current?.cancel(); }, []);

  const openVoiceLog = () => {
    if (!activeCats(data.categories, T).length) { toast('Add a practice in Setup first'); return; }
    voiceCapture.current?.cancel();
    const capture = beginVoiceCapture();
    voiceCapture.current = capture;
    openSheet({ kind: 'log', voice: true, voiceCapture: capture });
  };

  return (
    <>
      <main className="app"><Screen /></main>
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-in">
          <Tab v="today" label="Today" />
          <Tab v="insights" label="Insights" />
          <button className="tab-log" onClick={openVoiceLog} aria-label="Log by voice"><Icon.mic /></button>
          <Tab v="history" label="History" />
          <Tab v="setup" label="Setup" />
        </div>
      </nav>
      <MiniPlayer />
      {sheet?.kind === 'log' && <LogSheet key={`${sheet.catId ?? ''}:${sheet.voice ? `voice:${sheet.voiceCapture?.id ?? ''}` : 'manual'}`} catId={sheet.catId} custom={sheet.custom} voice={sheet.voice} voiceCapture={sheet.voiceCapture}
        onVoiceCaptureChange={capture => { voiceCapture.current = capture; }} />}
      {sheet?.kind === 'editCat' && <CategorySheet key={sheet.id ?? 'new'} id={sheet.id} />}
      {sheet?.kind === 'share' && <ShareSheet />}
      {sheet?.kind === 'install' && <InstallSheet />}
      {sheet?.kind === 'editLog' && <EditLogSheet key={sheet.id} id={sheet.id} />}
      {focusOpen && <Focus />}
    </>
  );
}
