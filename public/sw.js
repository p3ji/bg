// GameShare Service Worker - Home Screen App Badging & PWA installability
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch event listener to guarantee PWA installability criteria across Chromium browsers
self.addEventListener('fetch', () => {
  // Pass-through
});

// App Badging handler from clients
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SET_BADGE') {
    const count = Number(event.data.count) || 0;
    if (navigator.setAppBadge) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
    if (self.registration && 'setAppBadge' in self.registration) {
      if (count > 0) {
        self.registration.setAppBadge(count).catch(() => {});
      } else {
        self.registration.clearAppBadge().catch(() => {});
      }
    }
  } else if (event.data.type === 'CLEAR_BADGE') {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
    if (self.registration && 'clearAppBadge' in self.registration) {
      self.registration.clearAppBadge().catch(() => {});
    }
    if (self.registration && self.registration.getNotifications) {
      self.registration.getNotifications().then((notifs) => {
        notifs.forEach((n) => n.close());
      }).catch(() => {});
    }
  }
});

// Bring app to focus when user taps notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
