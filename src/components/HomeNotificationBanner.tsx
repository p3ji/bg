'use client';

import React, { useState, useEffect } from 'react';
import { BorrowRequest } from '@/types';
import { 
  Bell, 
  ArrowRightLeft, 
  CheckCircle2, 
  PackageCheck, 
  Clock, 
  ChevronRight,
  Smartphone,
  Check,
  MessageCircle,
  Copy,
  SendHorizontal
} from 'lucide-react';
import { requestBadgeNotificationPermission, getNotificationPermissionStatus } from '@/lib/badgeManager';
import { normalizeName, isSameHousehold } from '@/lib/normalize';

interface HomeNotificationBannerProps {
  requests: BorrowRequest[];
  activeHousehold?: string | null;
  onAcceptExchange: (requestId: string) => void;
  onConfirmExchange: (requestId: string) => void;
  onOpenNotifications: () => void;
}

export const HomeNotificationBanner: React.FC<HomeNotificationBannerProps> = ({
  requests,
  activeHousehold,
  onAcceptExchange,
  onConfirmExchange,
  onOpenNotifications,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [isSyncingBadge, setIsSyncingBadge] = useState<boolean>(false);
  const [badgeSynced, setBadgeSynced] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setPermissionStatus(getNotificationPermissionStatus());
  }, []);

  const handleEnableBadges = async () => {
    setIsSyncingBadge(true);
    const granted = await requestBadgeNotificationPermission();
    if (granted) {
      setPermissionStatus('granted');
      setBadgeSynced(true);
      setTimeout(() => setBadgeSynced(false), 3000);
    }
    setIsSyncingBadge(false);
  };

  // 1. Actionable requests requiring activeHousehold's action
  const actionableRequests = requests.filter((r) => {
    if (!activeHousehold) return false;
    const isSelfTest = isSameHousehold(r.holderName, r.requesterName);
    if (r.status === 'pending') {
      return isSelfTest || isSameHousehold(r.holderName, activeHousehold);
    }
    if (r.status === 'accepted') {
      return isSelfTest || isSameHousehold(r.requesterName, activeHousehold);
    }
    return false;
  });

  // 2. Outgoing requests submitted by activeHousehold waiting on friends
  const waitingRequests = requests.filter((r) => {
    if (!activeHousehold) return false;
    const isSelfTest = isSameHousehold(r.holderName, r.requesterName);
    if (isSelfTest) return false;
    if (r.status === 'pending') {
      return isSameHousehold(r.requesterName, activeHousehold);
    }
    if (r.status === 'accepted') {
      return isSameHousehold(r.holderName, activeHousehold);
    }
    return false;
  });

  if (actionableRequests.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4">
      <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-indigo-950/40 border-2 border-rose-500/30 dark:border-rose-500/40 rounded-2xl p-3.5 sm:p-4 shadow-md backdrop-blur-xs">
        
        {/* Banner Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rose-200/60 dark:border-rose-900/60">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
            </span>
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Action Needed for {activeHousehold}: {actionableRequests.length} Request{actionableRequests.length === 1 ? '' : 's'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {permissionStatus === 'granted' && (
              <button
                type="button"
                onClick={handleEnableBadges}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium transition-colors"
                title="Sync badge to phone Home Screen icon"
              >
                {badgeSynced ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Smartphone className="w-3 h-3 text-emerald-500" />
                )}
                <span>{badgeSynced ? 'Badge Synced!' : 'Sync App Badge'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNotifications}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Home Screen App Badge Permission Prompt (if not yet granted) */}
        {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
          <div className="mt-2.5 p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-zinc-800 dark:text-zinc-200 text-[11px] sm:text-xs font-medium">
                Want the notification badge on your phone Home Screen app icon?
              </span>
            </div>
            <button
              type="button"
              onClick={handleEnableBadges}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-[11px] shrink-0 shadow-xs transition-all"
            >
              {isSyncingBadge ? 'Enabling...' : badgeSynced ? 'Enabled!' : 'Enable App Badge'}
            </button>
          </div>
        )}

        {/* Actionable Requests List */}
        <div className="mt-2.5 space-y-2">
          {actionableRequests.map((req) => {
            const isSelfTest = isSameHousehold(req.requesterName, req.holderName);
            const isHolder = Boolean(isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, req.holderName)));
            const isRequester = Boolean(isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, req.requesterName)));

            return (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs"
              >
                {/* Request Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 truncate">
                      {req.gameTitle}
                    </span>
                    {req.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3" />
                        Step 1: Pending Holder Handshake
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse">
                        <PackageCheck className="w-3 h-3" />
                        Step 2: Handed Off — Confirm Receipt
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                    Requested by <strong className="text-zinc-900 dark:text-zinc-200">{req.requesterName}</strong> from <strong className="text-zinc-900 dark:text-zinc-200">{req.holderName}</strong>
                    {isSelfTest && (
                      <span className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">(Self-Borrow Test Mode)</span>
                    )}
                    {req.note && (
                      <span className="block text-[10px] text-zinc-500 italic mt-0.5">
                        &quot;{req.note}&quot;
                      </span>
                    )}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isHolder) onAcceptExchange(req.id);
                      }}
                      disabled={!isHolder}
                      className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                        isHolder
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-95 cursor-pointer'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                      }`}
                      title={isHolder ? "Accept and hand off game" : `Only ${req.holderName} can accept this request`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{isHolder ? 'Accept & Execute Handshake' : `Awaiting ${req.holderName}`}</span>
                    </button>
                  )}

                  {req.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isRequester) onConfirmExchange(req.id);
                      }}
                      disabled={!isRequester}
                      className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                        isRequester
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95 cursor-pointer'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                      }`}
                      title={isRequester ? "Confirm receipt to finish exchange" : `Only ${req.requesterName} can confirm receipt`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isRequester ? 'Confirm Receipt (Done!)' : `Awaiting ${req.requesterName}`}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
