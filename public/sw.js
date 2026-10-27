// GameShare Service Worker - Home Screen App Badging
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
  }
});
