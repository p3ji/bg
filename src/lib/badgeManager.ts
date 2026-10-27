/**
 * Home Screen App Badging & Notification Counter Utility
 * Synchronizes exchange and borrow request counts across:
 * 1. Web App Badging API (navigator.setAppBadge) for installed Home Screen PWAs (iOS Safari 16.4+ & Android)
 * 2. Active Service Worker postMessage for background badge synchronization
 * 3. Browser Tab Title: "(N) GameShare • Friend Board Game Library"
 * 4. Dynamic Browser Favicon with red notification badge
 */

let lastBadgeCount = 0;

export function updateFaviconBadge(count: number): void {
  if (typeof document === 'undefined') return;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw dark rounded base box
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(1, 1, 30, 30, 6);
    ctx.fill();

    // Draw dice dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, 9, 2.5, 0, Math.PI * 2);
    ctx.arc(16, 16, 2.5, 0, Math.PI * 2);
    ctx.arc(23, 23, 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (count > 0) {
      // Draw red badge on top right
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(23, 9, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Draw count text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 9 ? '9+' : String(count), 23, 9.5);
    }

    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL();
  } catch {
    // Ignore canvas errors
  }
}

export async function updateHomeScreenAppBadge(count: number): Promise<boolean> {
  lastBadgeCount = Math.max(0, count);
  let isSupported = false;

  // 1. Web App Badging API (iOS Safari 16.4+ standalone PWAs, Chrome Android, macOS / Windows PWA)
  if (typeof navigator !== 'undefined') {
    if ('setAppBadge' in navigator) {
      try {
        if (lastBadgeCount > 0) {
          await (navigator as unknown as { setAppBadge: (c: number) => Promise<void> }).setAppBadge(lastBadgeCount);
        } else {
          await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
        }
        isSupported = true;
      } catch (err) {
        console.debug('navigator.setAppBadge error or permission not yet granted:', err);
      }
    }

    // 2. Post to active service worker for background badging
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: lastBadgeCount > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
          count: lastBadgeCount,
        });
      } catch (err) {
        console.debug('ServiceWorker badge postMessage error:', err);
      }
    }
  }

  // 3. Tab Title Notification Prefix: e.g. "(1) GameShare • Friend Board Game Library"
  if (typeof document !== 'undefined') {
    if (lastBadgeCount > 0) {
      document.title = `(${lastBadgeCount}) GameShare • Friend Board Game Library`;
    } else {
      document.title = 'GameShare • Friend Board Game Library';
    }
  }

  // 4. Dynamic Favicon notification badge
  updateFaviconBadge(lastBadgeCount);

  return isSupported;
}

export async function requestBadgeNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      await updateHomeScreenAppBadge(lastBadgeCount);
      return true;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await updateHomeScreenAppBadge(lastBadgeCount);
      return true;
    }
    return false;
  } catch (err) {
    console.debug('Notification permission request error:', err);
    return false;
  }
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Sync badge when service worker activates
      if (lastBadgeCount > 0 && reg && 'setAppBadge' in reg) {
        (reg as unknown as { setAppBadge: (c: number) => Promise<void> }).setAppBadge(lastBadgeCount).catch(() => {});
      }
    }).catch((err) => {
      console.debug('ServiceWorker registration error:', err);
    });
  });
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}
