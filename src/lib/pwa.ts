/**
 * PWA & Standalone Detection Utilities for GameShare
 * Modeled after the proven PA Tracker PWA architecture.
 */

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Standard web W3C display-mode: standalone
    const isStandaloneMedia = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

    // 2. iOS Safari standalone mode
    const isIosStandalone = Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone);

    // 3. Android Trusted Web Activity / APK referrer
    const isAndroidApp = typeof document !== 'undefined' && document.referrer ? document.referrer.includes('android-app://') : false;

    // 4. Other standalone/fullscreen display modes
    const isFullscreenMedia = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUiMedia = window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches;

    return Boolean(isStandaloneMedia || isIosStandalone || isAndroidApp || isFullscreenMedia || isMinimalUiMedia);
  } catch {
    return false;
  }
}

export function isAppMarkedInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('gameshare_app_installed') === 'true';
  } catch {
    return false;
  }
}

export function markAppInstalled(installed: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (installed) {
      localStorage.setItem('gameshare_app_installed', 'true');
      localStorage.setItem('gameshare_continue_browser', 'true');
      localStorage.setItem('gameshare_pwa_dismissed', 'true');
    } else {
      localStorage.removeItem('gameshare_app_installed');
      localStorage.removeItem('gameshare_continue_browser');
      localStorage.removeItem('gameshare_pwa_dismissed');
    }
    window.dispatchEvent(new CustomEvent('gameshare_pwa_installed_changed', { detail: { installed } }));
  } catch {
    // Ignore localStorage errors
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches)
  );
}

export function detectDeviceOS(): 'ios' | 'android' | 'desktop' | 'other' {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  
  const isIos = /iphone|ipad|ipod/.test(ua) || 
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  if (isIos) return 'ios';

  if (/android/.test(ua)) return 'android';

  if (/macintosh|mac os x|windows|linux/.test(ua)) return 'desktop';

  return 'other';
}

export function shouldOfferInstallFirst(): boolean {
  if (typeof window === 'undefined') return false;
  if (isRunningStandalone() || isAppMarkedInstalled()) return false;

  // Query parameter preview mode (e.g. ?preview=install-first)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'install-first') return true;
  } catch {}

  // Only show the full-screen phone install gate on mobile/tablet touch devices
  if (!isMobileDevice()) return false;

  // Check if user previously clicked "Continue in browser"
  try {
    if (localStorage.getItem('gameshare_continue_browser') === 'true') {
      return false;
    }
  } catch {
    // Continue
  }

  return true;
}
