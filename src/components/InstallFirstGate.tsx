'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Smartphone, X, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { markAppInstalled, detectDeviceOS } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallFirstGateProps {
  onContinue: () => void;
}

export const InstallFirstGate: React.FC<InstallFirstGateProps> = ({ onContinue }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'desktop' | 'other'>('other');

  useEffect(() => {
    setDeviceOS(detectDeviceOS());

    // Check if a global deferred prompt was already stored on window
    if (typeof window !== 'undefined' && (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt) {
      setDeferredPrompt((window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt || null);
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt = e;
    };

    const handleAppInstalled = () => {
      markAppInstalled(true);
      onContinue();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onContinue]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          markAppInstalled(true);
          onContinue();
          return;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }
    // If native prompt not directly available or iOS Safari, show the step-by-step guide
    setIsGuideOpen(true);
  };

  const handleContinueInBrowser = () => {
    try {
      localStorage.setItem('gameshare_continue_browser', 'true');
      localStorage.setItem('gameshare_pwa_dismissed', 'true');
    } catch {}
    onContinue();
  };

  return (
    <div
      data-testid="install-first-gate"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 sm:p-8 text-center shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 my-auto">
        {/* App Icon */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-zinc-950 p-1 shadow-lg flex items-center justify-center border border-indigo-500/30 overflow-hidden">
          <Image
            src="/icon-192.png"
            alt="GameShare Icon"
            width={72}
            height={72}
            className="w-full h-full object-cover rounded-[14px]"
            priority
          />
        </div>

        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
          Recommended on Phones
        </p>

        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
          Add GameShare to your Home Screen
        </h2>

        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2.5 leading-relaxed">
          Install it first, then open GameShare directly from your Home Screen. The installed app gives you instant 1-tap launching and home screen badges for friend borrow requests.
        </p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={handleInstallClick}
            data-testid="btn-install-first"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Install GameShare</span>
          </button>

          <button
            type="button"
            onClick={handleContinueInBrowser}
            data-testid="btn-continue-browser"
            className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Continue in browser
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 leading-snug">
          Already installed? Close this browser tab and open GameShare from your Home Screen.
        </p>
      </div>

      {/* Step-by-Step Install Guide Modal */}
      {isGuideOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsGuideOpen(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-zinc-900 dark:text-zinc-100 text-left p-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            data-testid="install-guide-modal"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Add to Home Screen Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs sm:text-sm">
              {deviceOS === 'ios' ? (
                <div className="space-y-3">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <span>iPhone &amp; iPad (Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-600 dark:text-zinc-400 pl-1">
                    <li>
                      Tap the <strong className="text-zinc-900 dark:text-zinc-100">Share</strong> button{' '}
                      <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-600 dark:text-indigo-400" /> in Safari&apos;s bottom toolbar.
                    </li>
                    <li>
                      Scroll down and tap <strong className="text-zinc-900 dark:text-zinc-100">Add to Home Screen</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-zinc-700 dark:text-zinc-300" />.
                    </li>
                    <li>
                      Tap <strong className="text-zinc-900 dark:text-zinc-100">Add</strong> in the top-right corner.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <span>Android (Chrome / Samsung Internet)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-600 dark:text-zinc-400 pl-1">
                    <li>
                      Tap the <strong className="text-zinc-900 dark:text-zinc-100">three dots (⋮)</strong> menu{' '}
                      <MoreVertical className="w-3.5 h-3.5 inline mx-1 text-zinc-600 dark:text-zinc-400" /> in the browser top-right corner.
                    </li>
                    <li>
                      Tap <strong className="text-zinc-900 dark:text-zinc-100">Install app</strong> or <strong className="text-zinc-900 dark:text-zinc-100">Add to Home screen</strong>.
                    </li>
                    <li>
                      Confirm by tapping <strong className="text-zinc-900 dark:text-zinc-100">Install</strong>.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleContinueInBrowser}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium cursor-pointer"
              >
                Continue in browser
              </button>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
