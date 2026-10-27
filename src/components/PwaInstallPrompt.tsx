'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  Smartphone, 
  Check, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const STORAGE_KEY = 'gameshare_pwa_dismissed';

export function isAppStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
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

interface PwaInstallPromptProps {
  canShowBanner?: boolean; // Wait until onboarding/identity modal finishes
  forceShowInstructions?: boolean;
  onCloseInstructions?: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({
  canShowBanner = true,
  forceShowInstructions = false,
  onCloseInstructions,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'desktop' | 'other'>('other');
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    setIsStandalone(isAppStandalone());
    setDeviceOS(detectDeviceOS());
    
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsDismissed(dismissed);

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent standard browser mini-infobar to use custom prompt
      e.preventDefault();
      setDeferredPrompt(e);
      // Dispatch custom event so SettingsModal can also detect deferredPrompt
      window.dispatchEvent(new CustomEvent('pwa_prompt_ready'));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstalledSuccess(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Sync forced instructions modal from external trigger (e.g. SettingsModal)
  useEffect(() => {
    if (forceShowInstructions) {
      setShowInstructionsModal(true);
    }
  }, [forceShowInstructions]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalledSuccess(true);
          setDeferredPrompt(null);
          localStorage.setItem(STORAGE_KEY, 'true');
        }
      } catch (err) {
        console.error('Error invoking PWA install prompt:', err);
        setShowInstructionsModal(true);
      }
    } else {
      // If native prompt is not available, open the step-by-step visual instructions
      setShowInstructionsModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleCloseModal = () => {
    setShowInstructionsModal(false);
    if (onCloseInstructions) {
      onCloseInstructions();
    }
  };

  // Do not show banner if already running as installed app or dismissed or not ready
  const shouldRenderBanner = !isStandalone && !isDismissed && canShowBanner && !installedSuccess;

  return (
    <>
      {/* Floating Bottom Rich Banner */}
      {shouldRenderBanner && (
        <aside
          role="region"
          aria-label="Install GameShare Web App"
          className="fixed z-50 bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl p-4 shadow-2xl shadow-indigo-500/10 dark:shadow-black/60 flex flex-col gap-3">
            
            <div className="flex items-start justify-between gap-3">
              {/* App Icon + Title & Value Proposition */}
              <div className="flex items-start gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md ring-1 ring-black/5 dark:ring-white/10 bg-zinc-950">
                  <Image
                    src="/icon-192.png"
                    alt="GameShare Icon"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Install GameShare
                    </h3>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-md">
                      Free Web App
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-snug">
                    Faster 1-tap access &amp; home screen notification badge alerts for game borrows.
                  </p>
                </div>
              </div>

              {/* Close / Dismiss */}
              <button
                type="button"
                onClick={handleDismiss}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
                aria-label="Dismiss install banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Not now
              </button>

              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{deviceOS === 'ios' ? 'How to Install' : 'Install Now'}</span>
              </button>
            </div>

          </div>
        </aside>
      )}

      {/* Step-by-Step Installation Modal */}
      {showInstructionsModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="pwa-install-guide-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Install GameShare App
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {deviceOS === 'ios' ? 'iOS Safari Guide' : deviceOS === 'android' ? 'Android Guide' : 'Browser Guide'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Instructions */}
            <div className="py-4 space-y-4">
              {deviceOS === 'ios' ? (
                <>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    To install on iPhone or iPad using Safari:
                  </p>
                  <ol className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        Tap the <strong className="text-zinc-900 dark:text-zinc-100">Share</strong> button{' '}
                        <Share className="w-3.5 h-3.5 inline text-indigo-600 dark:text-indigo-400 mx-0.5" />{' '}
                        in Safari&apos;s bottom toolbar.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        Scroll down and tap <strong className="text-zinc-900 dark:text-zinc-100">Add to Home Screen</strong>{' '}
                        <PlusSquare className="w-3.5 h-3.5 inline text-indigo-600 dark:text-indigo-400 mx-0.5" />.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        Tap <strong className="text-zinc-900 dark:text-zinc-100">Add</strong> in the top-right corner.
                      </div>
                    </li>
                  </ol>
                </>
              ) : deviceOS === 'android' ? (
                <>
                  {deferredPrompt ? (
                    <div className="text-center py-2">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                        Your browser supports direct 1-tap installation.
                      </p>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tap to Install GameShare</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        To install on Android Chrome or Samsung Internet:
                      </p>
                      <ol className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                        <li className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                            1
                          </div>
                          <div>
                            Tap the <strong className="text-zinc-900 dark:text-zinc-100">three dots menu (⋮)</strong>{' '}
                            <MoreVertical className="w-3.5 h-3.5 inline text-zinc-600 dark:text-zinc-400 mx-0.5" />{' '}
                            in the top-right corner of Chrome.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                            2
                          </div>
                          <div>
                            Select <strong className="text-zinc-900 dark:text-zinc-100">&quot;Install app&quot;</strong> or{' '}
                            <strong className="text-zinc-900 dark:text-zinc-100">&quot;Add to Home screen&quot;</strong>.
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                            3
                          </div>
                          <div>
                            Confirm by tapping <strong className="text-zinc-900 dark:text-zinc-100">Install</strong>.
                          </div>
                        </li>
                      </ol>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    To install on desktop Chrome or Edge:
                  </p>
                  <ol className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        Look for the <strong className="text-zinc-900 dark:text-zinc-100">Install icon</strong>{' '}
                        <Download className="w-3.5 h-3.5 inline text-indigo-600 dark:text-indigo-400 mx-0.5" /> in your browser&apos;s address bar.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        Click <strong className="text-zinc-900 dark:text-zinc-100">Install</strong> to add GameShare as a desktop app.
                      </div>
                    </li>
                  </ol>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
