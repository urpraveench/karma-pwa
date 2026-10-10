import { BUILD } from '../version';

// Google Analytics (GA4), only with the person's consent. Nothing is loaded or sent until they choose Allow, and
// builds without VITE_GA_MEASUREMENT_ID (test mode, the emulators) never ask. Events carry no names, emails or
// practice names. The website (site/) reports to the same property; its domains are linked so a visit that moves
// from the website to the app counts as one person.

const ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || '';
// The device's choice. A new name from 1.8.0 (on by default): choices stored before it, mostly the old unticked
// sign-up box, no longer count, so every account starts on; anyone who turns it off from 1.8.0 stays off.
const KEY = 'tiktym:stats';
const OLD_KEY = 'tiktym:analytics';
try { localStorage.removeItem(OLD_KEY); } catch { /* storage blocked */ }
const LINKED_DOMAINS = ['tiktym.com', 'www.tiktym.com', 'app.tiktym.com'];

export type Consent = 'granted' | 'denied' | null;
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } & Record<string, unknown>;
const w = () => window as unknown as GtagWindow;

export const analyticsAvailable = () => !!ID;

export function readConsent(): Consent {
  try { const v = localStorage.getItem(KEY); return v === 'granted' || v === 'denied' ? v : null; } catch { return null; }
}

let loaded = false;

function load() {
  if (loaded || !ID) return;
  loaded = true;
  const win = w();
  win[`ga-disable-${ID}`] = false;
  win.dataLayer = win.dataLayer || [];
  // gtag must push the `arguments` object itself, as Google's snippet does
  win.gtag = function gtag() { win.dataLayer!.push(arguments); };
  win.gtag('js', new Date());
  win.gtag('config', ID, {
    send_page_view: false, // screens are sent by trackScreen
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    app_version: BUILD.version,
    linker: { domains: LINKED_DOMAINS },
  });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  document.head.appendChild(s);
}

/** Removes Google Analytics cookies (_ga, _ga_<id>) for this site. */
function clearCookies() {
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (!name.startsWith('_ga')) continue;
    for (const domain of ['', `; domain=${location.hostname}`, `; domain=.${location.hostname}`])
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
  }
}

export function setConsent(c: 'granted' | 'denied') {
  try { localStorage.setItem(KEY, c); } catch { /* storage blocked: the choice lasts this visit */ }
  if (c === 'granted') { load(); return; }
  w()[`ga-disable-${ID}`] = true; // gtag stops sending immediately
  clearCookies();
}

/** At start-up, before anyone signs in: resume Analytics only for a device that explicitly said yes. */
export function startAnalytics() {
  if (readConsent() === 'granted') load();
}

/** Signed in (ANA-01): on for every account, new or existing, unless this device explicitly said no. */
export function startAccountAnalytics() {
  if (readConsent() !== 'denied') load();
}

/** What Setup shows: on unless this device said no. */
export const analyticsChoice = () => readConsent() !== 'denied';

export function track(name: string, params: Record<string, string | number | boolean> = {}) {
  if (!loaded || readConsent() === 'denied') return;
  w().gtag?.('event', name, params);
}

/** A page view per screen; the app has no URLs of its own, so each tab gets a path such as /today. */
export function trackScreen(screen: string) {
  track('page_view', { page_title: screen, page_location: `${location.origin}/${screen.toLowerCase()}` });
}
