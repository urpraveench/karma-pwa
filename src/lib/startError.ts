// What the login screen says when TikTym can't start or can't load an account's data. Plain words, never developer hints.

export type StartFailure = 'start' | 'data';

export const OFFLINE = 'You\'re offline. Connect to the internet, then tap Reload.';

/** The message for a failed start (AUTH-22) or data load (FIRST-04); offline says that instead. */
export function startErrorMessage(what: StartFailure, online: boolean): string {
  if (!online) return OFFLINE;
  return what === 'start'
    ? 'TikTym couldn\'t finish loading. Check your connection, then tap Reload.'
    : 'Couldn\'t load your practices. Check your connection, then tap Reload.';
}

/**
 * True when TikTym's own code failed to load: after a deploy, a copy of the app from before it asks for files the
 * server no longer has (Firebase Hosting answers them with index.html). Chrome, Safari and Firefox word it differently.
 */
export function isMissingCode(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /dynamically imported module|Importing a module script failed|Unable to preload|is not a valid JavaScript MIME type/i.test(msg);
}

/** Reloads into the new version at most once a minute, so a reload that fails too shows the message instead (APP-33). */
export const AUTO_RELOAD_GAP = 60_000;
export function shouldAutoReload(e: unknown, lastReload: number | null, now: number, online: boolean): boolean {
  return online && isMissingCode(e) && (lastReload === null || now - lastReload > AUTO_RELOAD_GAP);
}
