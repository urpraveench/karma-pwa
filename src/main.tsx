import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installedApp } from './components/MovedBar';
import { startAnalytics } from './lib/analytics';
import { moveAction } from './lib/moved';
import { applyTheme, readTheme } from './state/theme';
import './styles.css';

window.tiktymStarted = true; // the start screen in index.html stops waiting to reload when the connection returns
const move = moveAction(location.href, installedApp());
if (move && move !== 'bar') {
  location.replace(move.go); // the old address in a browser tab: straight to app.tiktym.com (GTM-08)
} else {
  applyTheme(readTheme()); // before first paint, so there's no flash of the wrong theme
  startAnalytics(); // only if this device already said yes

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
