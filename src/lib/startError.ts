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
