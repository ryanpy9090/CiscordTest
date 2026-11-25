/* Ciscord service worker — enables web notifications on mobile browsers
   (Android Chrome ignores `new Notification()` from a page; notifications
   must be shown through a service worker registration). */
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  const notif = event.notification;
  const action = event.action; // 'accept' | 'decline' | '' (tap on body)
  const data = notif.data || {};
  notif.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      let client = null;
      for (const c of clientList) {
        if ('focus' in c) { await c.focus(); client = c; break; }
      }
      if (!client) client = await self.clients.openWindow('./');
      if (client && action) {
        // Call notification action (Accept / Decline): forward to the page.
        setTimeout(() => {
          client.postMessage({ type: 'ciscord-call-action', action, callId: (data && data.callId) || null });
        }, 600);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Swiping the call notification away = decline.
  const data = (event.notification && event.notification.data) || {};
  if (data.callId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length) {
          clientList[0].postMessage({ type: 'ciscord-call-action', action: 'decline', callId: data.callId });
        }
      })
    );
  }
});
