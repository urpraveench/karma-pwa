import { useEffect } from 'react';
import { Shell } from './Shell';
import { MovedBar } from './components/MovedBar';
import { UpdateBar } from './components/UpdateBar';
import { FirstRun } from './screens/FirstRun';
import { Login } from './screens/Login';
import { AppProvider, useApp } from './state/app';
import { TimerProvider } from './state/timer';
import { FeedbackProvider } from './ui/feedback';

const startScreen = () => document.getElementById('boot');

function Root() {
  const { phase } = useApp();
  // index.html's start screen stays up until there's something to show (FIRST-03)
  useEffect(() => { if (phase.kind !== 'boot' && phase.kind !== 'loading') startScreen()?.remove(); }, [phase.kind]);
  switch (phase.kind) {
    case 'boot': return null;
    case 'login': return <Login key={phase.error ?? ''} error={phase.error} />;
    case 'loading': return startScreen() ? null : <div className="login"><p className="lead">Loading TikTym…</p></div>;
    case 'choose': return <FirstRun />;
    case 'ready': return <TimerProvider><Shell /></TimerProvider>;
  }
}

export function App() {
  return (
    <FeedbackProvider>
      <AppProvider>
        <MovedBar />
        <UpdateBar />
        <Root />
      </AppProvider>
    </FeedbackProvider>
  );
}
