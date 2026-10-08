// The app moved from tiktym.web.app to app.tiktym.com (GTM-06). The same Hosting site still answers on the old
// addresses, so Terms, Privacy and the sign-in handler keep working there; only the app itself moves people on.

export const APP_ORIGIN = 'https://app.tiktym.com';
export const OLD_HOSTS = ['tiktym.web.app', 'tiktym.firebaseapp.com'];

/** The same page on app.tiktym.com (path, query and #fragment kept) when `href` is on an old address; else null. */
export function movedUrl(href: string): string | null {
  const u = new URL(href);
  if (!OLD_HOSTS.includes(u.hostname)) return null;
  return APP_ORIGIN + u.pathname + u.search + u.hash;
}

/**
 * What to do on load (GTM-08, GTM-09). A browser tab is sent on straight away. An app installed from the old
 * address stays where it is, with a "TikTym has moved" bar: sending it to another address would open that in a
 * browser view on top of the app, and the home-screen icon would still point at the old address.
 */
export function moveAction(href: string, installed: boolean): { go: string } | 'bar' | null {
  const to = movedUrl(href);
  if (!to) return null;
  return installed ? 'bar' : { go: to };
}
