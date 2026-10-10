import { useState, type ReactNode } from 'react';
import { dismissInstall, showInstallCard, type InstallEnv, type InstallNudge } from '../lib/install';
import { useApp } from '../state/app';
import { useInstall } from '../state/install';
import { useFeedback } from '../ui/feedback';
import { Icon } from '../ui/icons';

const APP = 'https://app.tiktym.com';
const NUDGE_KEY = 'tiktym:install-nudge';
const readNudge = (): InstallNudge => { try { return JSON.parse(localStorage.getItem(NUDGE_KEY) || '') as InstallNudge; } catch { return { dismissals: 0 }; } };
const saveNudge = (n: InstallNudge) => { try { localStorage.setItem(NUDGE_KEY, JSON.stringify(n)); } catch { /* storage blocked: shows again next time */ } };

const Step = ({ n, children }: { n: number; children: ReactNode }) => <li><b className="step-n">{n}</b><span>{children}</span></li>;
const Glyph = ({ children }: { children: ReactNode }) => <span className="glyph" aria-hidden="true">{children}</span>;

/** What to do on this phone (APP-27 to APP-29); used by the card on Today and the sheet in Setup. */
export function InstallSteps({ env }: { env: InstallEnv }) {
  switch (env) {
    case 'prompt':
      return <p className="install-p">It opens like an app: full screen, from your home screen, even offline. One tap below.</p>;
    case 'ios':
      return (
        <>
          <ol className="install-steps">
            <Step n={1}>Tap <strong>Share</strong> <Glyph><Icon.share /></Glyph> at the bottom of Safari.</Step>
            <Step n={2}>Choose <strong>Add to Home Screen</strong> <Glyph><Icon.addSquare /></Glyph>, then <strong>Add</strong>.</Step>
          </ol>
          <p className="install-p small">No Share button at the bottom? You're inside another app: open this page in Safari first.</p>
        </>
      );
    case 'in-app':
      return (
        <>
          <p className="install-p">You're in another app's browser (WhatsApp, Instagram, LinkedIn), which can't add apps to your home screen.</p>
          <ol className="install-steps">
            <Step n={1}>Tap <strong>⋯</strong> or <strong>⋮</strong> and choose <strong>Open in browser</strong> (or <strong>Open in Safari</strong>).</Step>
            <Step n={2}>Then add TikTym to your home screen from there.</Step>
          </ol>
        </>
      );
    case 'android':
      return (
        <ol className="install-steps">
          <Step n={1}>In Chrome, tap <strong>⋮</strong> at the top right.</Step>
          <Step n={2}>Choose <strong>Add to home screen</strong> or <strong>Install app</strong>.</Step>
        </ol>
      );
    case 'other':
      return <p className="install-p">On your phone, open <strong>app.tiktym.com</strong> in Safari or Chrome and add it to your home screen. It opens like an app, even offline.</p>;
    case 'installed':
      return <p className="install-p">TikTym is on your home screen. Open it from there.</p>;
  }
}

/** The buttons that go with the steps: Install where the browser offers it, Copy link inside other apps. */
function InstallActions({ env, after }: { env: InstallEnv; after?: () => void }) {
  const { install } = useInstall();
  const { toast } = useFeedback();
  if (env === 'prompt') return <button className="btn" type="button" onClick={async () => { if (await install()) { toast('TikTym is on your home screen'); after?.(); } }}>Install TikTym</button>;
  if (env === 'in-app') return (
    <button className="btn btn-2" type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(APP); toast('Link copied. Paste it into Safari or Chrome.'); } catch { toast(`Open ${APP} in your browser`); }
    }}>Copy the link</button>
  );
  return null;
}

/** On Today, after the first minutes are logged (APP-30); Not now snoozes it for 3 days, twice ends it. */
export function InstallCard() {
  const { data, T } = useApp();
  const { env } = useInstall();
  const [nudge, setNudge] = useState(readNudge);
  if (!showInstallCard({ env, hasLogged: data.logs.length > 0, nudge, today: T })) return null;
  const notNow = () => { const n = dismissInstall(nudge, T); saveNudge(n); setNudge(n); };
  return (
    <section className="install-card" aria-label="Add TikTym to your home screen">
      <div className="install-head">
        <h2>Get TikTym on your home screen</h2>
        <button className="x" type="button" aria-label="Not now" onClick={notNow}><Icon.x /></button>
      </div>
      <InstallSteps env={env} />
      <div className="install-actions">
        <InstallActions env={env} after={notNow} />
        <button className="link" type="button" onClick={notNow}>Not now</button>
      </div>
    </section>
  );
}

/** Setup › Add TikTym to your home screen, at any time (APP-31). */
export function InstallSheetBody() {
  const { env } = useInstall();
  return (
    <>
      <h2>Add TikTym to your home screen</h2>
      <p className="sheet-sub">It opens like an app, full screen and offline, without an app store.</p>
      <InstallSteps env={env} />
      <div className="install-actions"><InstallActions env={env} /></div>
    </>
  );
}
