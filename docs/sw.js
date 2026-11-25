/* Ciscord service worker — web notifications (messages + calls).
   Two sources:
   1. Local (same-tab) notifications via `registration.showNotification()` —
      used when the tab is open.
   2. Web Push `push` events — deliver messages and call invitations even
      when every Ciscord tab is fully closed (payload encrypted by the
      sender's browser, see web/push.js).
   Call notifications carry Accept / Decline actions: clicking one focuses
   (or opens) the app and forwards the choice to the page via postMessage. */

// ── Web Push: fires even with the app fully closed ──
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  const isCall = !!payload.call;
  const title = payload.title || (isCall ? '📞 Incoming call' : '💬 New message');

  event.waitUntil((async () => {
    // If the app is open and visible, skip the push notification — the page
    // shows its own in-app alert (Blip + toast), so no double notification.
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visible = clients.some(c => c.visibilityState === 'visible');
      if (visible && !isCall) return;
    } catch (e) {}

    const opts = {
      body: payload.body || '',
      tag: isCall ? 'ciscord-call' : 'ciscord-msg',
      icon: './assets/icon.png',
      badge: './assets/icon.png',
      renotify: true,
      // When the app is fully closed no page exists to play Blip, so let the
      // system notification sound play. In-app message notifications use the
      // silent:true + Blip path instead, so no double sound.
      silent: false,
      data: payload
    };
    if (isCall) {
      opts.requireInteraction = true;
      opts.vibrate = [400, 200, 400, 200, 400];
      opts.actions = [
        { action: 'accept', title: '✓ Accept' },
        { action: 'decline', title: '✕ Decline' }
      ];
    }
    await self.registration.showNotification(title, opts);
  })());
});

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
