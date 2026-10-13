import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { isDifferentBuild, type Build } from '../version';

const CHECK_EVERY = 30 * 60_000;

/**
 * The live build, when it differs from the one running. Checked on start, whenever the app comes back on
 * screen, and every 30 minutes. Stays null in the dev server, offline, or when version.json can't be read, and always in
 * the Android app, which Play updates (AND-06).
 */
export function useNewerBuild(): Build | null {
  const [live, setLive] = useState<Build | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV || Capacitor.isNativePlatform()) return;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch('/version.json', { cache: 'no-store' });
        if (!r.ok) return;
        const v: Build = await r.json();
        if (alive && v?.version && isDifferentBuild(v)) setLive(v);
      } catch { /* offline: try again later */ }
    };
    void check();
    const vis = () => { if (!document.hidden) void check(); };
    document.addEventListener('visibilitychange', vis);
    const id = setInterval(check, CHECK_EVERY);
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); clearInterval(id); };
  }, []);
  return live;
}

/** Fetches the new service worker (which takes over as soon as it's installed), then reloads into the new build. */
export async function reloadToLatest() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update();
      const sw = reg.installing || reg.waiting;
      if (sw) await new Promise(done => {
        sw.addEventListener('statechange', () => { if (sw.state === 'activated') done(null); });
        setTimeout(done, 5000);
      });
    }
  } catch { /* reload anyway */ }
  location.reload();
}
