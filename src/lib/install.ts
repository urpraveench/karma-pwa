import { addDays } from './date';
import type { DateStr } from './types';

// Helping people add TikTym to their home screen (APP-27 to APP-31). Most people only know app stores, and links
// shared on WhatsApp open in WhatsApp's own browser, where installing is impossible.

/**
 * installed: already on the home screen. prompt: the browser offers its own install dialog (Android Chrome,
 * Samsung Internet, Edge). ios: iPhone or iPad, where it's Share › Add to Home Screen. in-app: inside WhatsApp,
 * Instagram, Facebook or LinkedIn, where installing is impossible. android: an Android browser without the dialog
 * (yet). other: a computer without the dialog.
 */
export type InstallEnv = 'installed' | 'prompt' | 'ios' | 'in-app' | 'android' | 'other';

/** Apps' built-in browsers, from their user agents; "; wv)" is an Android in-app WebView. */
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|WhatsApp|Snapchat|Line\/|; wv\)/i;

export function installEnv(o: { ua: string; standalone: boolean; canPrompt: boolean }): InstallEnv {
  if (o.standalone) return 'installed';
  if (IN_APP.test(o.ua)) return 'in-app';
  if (o.canPrompt) return 'prompt';
  if (/iPhone|iPad|iPod/.test(o.ua)) return 'ios';
  if (/Android/.test(o.ua)) return 'android';
  return 'other';
}

/** How often the card on Today has been put off: "Not now" snoozes it for 3 days, a second "Not now" ends it. */
export interface InstallNudge { dismissals: number; until?: DateStr }
export const SNOOZE_DAYS = 3;

export function showInstallCard(o: { env: InstallEnv; hasLogged: boolean; nudge: InstallNudge; today: DateStr }): boolean {
  if (o.env === 'installed' || o.env === 'other' || !o.hasLogged) return false;
  if (o.nudge.dismissals >= 2) return false;
  return !o.nudge.until || o.today >= o.nudge.until;
}

export const dismissInstall = (n: InstallNudge, today: DateStr): InstallNudge => ({ dismissals: n.dismissals + 1, until: addDays(today, SNOOZE_DAYS) });
