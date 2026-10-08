import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startAnalytics } from './lib/analytics';
import { applyTheme, readTheme } from './state/theme';
import './styles.css';

applyTheme(readTheme()); // before first paint, so there's no flash of the wrong theme
startAnalytics(); // only if this device already said yes

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
