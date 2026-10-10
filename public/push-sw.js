// Push reminders (NOTIF-09) and the app badge (NOTIF-13), loaded into the service worker that vite-plugin-pwa
// generates (vite.config.ts › workbox.importScripts). The server sends { title, body, badge, url, tag }.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* not JSON: show a plain notification */ }
  const shown = self.registration.showNotification(d.title || 'TikTym', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', tag: d.tag || 'tiktym', data: { url: d.url || '/' },
  });
  const badge = typeof d.badge === 'number' && self.navigator.setAppBadge ? self.navigator.setAppBadge(d.badge).catch(() => {}) : null;
  e.waitUntil(Promise.all([shown, badge]));
});

// A tap opens TikTym, or brings it forward if it's already open.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.location.origin));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
