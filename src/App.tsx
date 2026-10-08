import { Shell } from './Shell';
import { UpdateBar } from './components/UpdateBar';
import { Login } from './screens/Login';
import { AppProvider, useApp } from './state/app';
import { TimerProvider } from './state/timer';
import { FeedbackProvider } from './ui/feedback';

function Root() {
  const { phase } = useApp();
  switch (phase.kind) {
    case 'boot': return null;
    case 'login': return <Login key={phase.error ?? ''} error={phase.error} />;
    case 'loading': return <div className="login"><p className="lead">Loading TikTym…</p></div>;
    case 'ready': return <TimerProvider><Shell /></TimerProvider>;
  }
}

export function App() {
  return (
    <FeedbackProvider>
      <AppProvider>
        <UpdateBar />
        <Root />
      </AppProvider>
    </FeedbackProvider>
  );
}
