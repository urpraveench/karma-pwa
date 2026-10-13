import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { installEnv, type InstallEnv } from '../lib/install';

// The browser's own install dialog (Android Chrome, Samsung Internet, Edge) arrives as a "beforeinstallprompt" event,
// sometimes before React starts, so it's caught here, at import, and kept for the Install button (APP-27).

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let offer: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach(f => f());

if (typeof window !== 'undefined') {
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); offer = e as InstallPromptEvent; changed(); });
  addEventListener('appinstalled', () => { offer = null; justInstalled = true; changed(); });
}

// The Android app is installed by definition; its WebView would otherwise look like an in-app browser (AND-06).
const standalone = () =>
  Capacitor.isNativePlatform() || justInstalled || matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Where this page could be installed from, kept current as the browser's offer arrives or the app gets installed. */
export function useInstall(): { env: InstallEnv; install: () => Promise<boolean> } {
  const [, rerender] = useState(0);
  useEffect(() => { const f = () => rerender(n => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const env = installEnv({ ua: navigator.userAgent, standalone: standalone(), canPrompt: !!offer });
  async function install() {
    if (!offer) return false;
    const o = offer;
    await o.prompt();
    const { outcome } = await o.userChoice;
    offer = null; // a dialog can be shown only once
    if (outcome === 'accepted') justInstalled = true;
    changed();
    return outcome === 'accepted';
  }
  return { env, install };
}
