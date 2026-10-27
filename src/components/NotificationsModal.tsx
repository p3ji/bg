'use client';

import React, { useState } from 'react';
import { BorrowRequest, Game } from '@/types';
import { normalizeName } from '@/lib/normalize';
import { 
  X, 
  Bell, 
  MessageCircle, 
  Smartphone, 
  Copy, 
  Check, 
  CheckCircle2, 
  Trash2,
  Clock,
  ArrowRight,
  Handshake,
  PackageCheck,
  ShieldAlert,
  ArrowRightLeft,
  Sparkles,
  History
} from 'lucide-react';

interface NotificationsModalProps {
  requests: BorrowRequest[];
  games: Game[];
  isOpen: boolean;
  activeHousehold?: string | null;
  onClose: () => void;
  onAcceptExchange: (requestId: string) => void;
  onConfirmExchange: (requestId: string) => void;
  onDismissRequest: (requestId: string) => void;
  onSelectGame: (game: Game) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  requests,
  games,
  isOpen,
  activeHousehold,
  onClose,
  onAcceptExchange,
  onConfirmExchange,
  onDismissRequest,
  onSelectGame,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  if (!isOpen) return null;

  const activeRequests = requests.filter((r) => r.status === 'pending' || r.status === 'accepted');
  const completedRequests = requests.filter((r) => r.status === 'fulfilled');

  // 1. Requests requiring action from activeHousehold (matching the badge counter)
  const myActionableRequests = activeRequests.filter((req) => {
    if (!activeHousehold) return false;
    const isSelfTest = normalizeName(req.holderName) === normalizeName(req.requesterName);
    if (req.status === 'pending') {
      return isSelfTest || normalizeName(req.holderName) === normalizeName(activeHousehold);
    }
    if (req.status === 'accepted') {
      return isSelfTest || normalizeName(req.requesterName) === normalizeName(activeHousehold);
    }
    return false;
  });

  // 2. Outgoing requests submitted by activeHousehold waiting on friends
  const myWaitingRequests = activeRequests.filter((req) => {
    if (!activeHousehold) return false;
    const isSelfTest = normalizeName(req.holderName) === normalizeName(req.requesterName);
    if (isSelfTest) return false;
    if (req.status === 'pending') {
      return normalizeName(req.requesterName) === normalizeName(activeHousehold);
    }
    if (req.status === 'accepted') {
      return normalizeName(req.holderName) === normalizeName(activeHousehold);
    }
    return false;
  });

  // 3. Requests between other friends
  const otherGroupRequests = activeRequests.filter((req) => {
    const isActionable = myActionableRequests.some((r) => r.id === req.id);
    const isWaiting = myWaitingRequests.some((r) => r.id === req.id);
    return !isActionable && !isWaiting;
  });

  const renderRequestCard = (req: BorrowRequest, isActionableForUser: boolean) => {
    const matchedGame = games.find((g) => g.id === req.gameId);
    const isPendingHolder = req.status === 'pending';
    const isAwaitingRequester = req.status === 'accepted';

    const isSelfTest = Boolean(normalizeName(req.holderName) === normalizeName(req.requesterName));
    const isCurrentUserHolder = Boolean(isSelfTest || (activeHousehold && normalizeName(activeHousehold) === normalizeName(req.holderName)));
    const isCurrentUserRequester = Boolean(isSelfTest || (activeHousehold && normalizeName(activeHousehold) === normalizeName(req.requesterName)));

    return (
      <div
        key={req.id}
        className={`p-4 rounded-xl border transition-all ${
          isActionableForUser
            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs ring-1 ring-rose-500/10'
            : isAwaitingRequester
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800'
        }`}
      >
        {/* Header: Game Title and Time */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 
              onClick={() => {
                if (matchedGame) {
                  onClose();
                  onSelectGame(matchedGame);
                }
              }}
              className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              {req.gameTitle}
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(req.requestedAt)}
          </span>
        </div>

        {/* Exchange Flow Visualizer */}
        <div className="mt-2.5 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Current Holder</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {req.holderName}
            </span>
          </div>

          <div className="flex flex-col items-center px-2">
            <div className="flex items-center gap-1 text-zinc-400">
              <span className="h-px w-6 bg-zinc-300 dark:bg-zinc-700" />
              <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
              <span className="h-px w-6 bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
              {isPendingHolder ? 'Step 1: Accept' : 'Step 2: Confirm'}
            </span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Borrower</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {req.requesterName}
            </span>
          </div>
        </div>

        {/* Step Status Banner */}
        <div className="mt-2.5">
          {isPendingHolder ? (
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold">Step 1:</span> Waiting for <strong>{req.holderName}</strong> to accept & execute exchange.
              </div>
              {isCurrentUserHolder && (
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] shrink-0 animate-pulse">
                  Your Action Needed
                </span>
              )}
            </div>
          ) : (
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold">Step 2:</span> <strong>{req.holderName}</strong> executed exchange! Waiting for <strong>{req.requesterName}</strong> to confirm receipt.
              </div>
              {isCurrentUserRequester && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0 animate-pulse">
                  Your Action Needed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Note if provided */}
        {req.note && (
          <p className="mt-2 text-[11px] text-zinc-500 italic bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-100 dark:border-zinc-800">
            &ldquo;{req.note}&rdquo;
          </p>
        )}

        {/* Actions Toolbar */}
        <div className="mt-3 pt-2.5 flex items-center justify-between gap-2 border-t border-zinc-200/70 dark:border-zinc-700/70">
          
          {/* Nudge Ping Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleWhatsApp(req)}
              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded transition-colors"
              title={isPendingHolder ? `WhatsApp ${req.holderName}` : `WhatsApp ${req.requesterName}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSMS(req)}
              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded transition-colors"
              title={isPendingHolder ? `iMessage / SMS ${req.holderName}` : `iMessage / SMS ${req.requesterName}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleCopyNudge(req)}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
              title="Copy nudge link & message"
            >
              {copiedId === req.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDismissRequest(req.id)}
              className="p-1.5 text-zinc-400 hover:text-rose-600 rounded transition-colors"
              title="Cancel exchange request"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {isPendingHolder ? (
              <button
                type="button"
                onClick={() => {
                  if (isCurrentUserHolder) {
                    onAcceptExchange(req.id);
                  }
                }}
                disabled={!isCurrentUserHolder}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                  isCurrentUserHolder
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                }`}
                title={isCurrentUserHolder ? "Accept and execute exchange" : `Only ${req.holderName} can accept`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isCurrentUserHolder ? 'Accept & Execute Exchange' : `Awaiting ${req.holderName}`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isCurrentUserRequester) {
                    onConfirmExchange(req.id);
                  }
                }}
                disabled={!isCurrentUserRequester}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                  isCurrentUserRequester
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                }`}
                title={isCurrentUserRequester ? "Confirm receipt to finish transfer" : `Only ${req.requesterName} can confirm receipt`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isCurrentUserRequester ? 'Confirm Received & Transfer' : `Awaiting ${req.requesterName}`}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    );
  };

  const getNudgeText = (req: BorrowRequest) => {
    if (req.status === 'pending') {
      return `Hey ${req.holderName}! ${req.requesterName} requested to borrow "${req.gameTitle}" from our game library. Please accept the exchange in the app to coordinate hand-off! 🎲`;
    }
    return `Hey ${req.requesterName}! ${req.holderName} has accepted and executed the exchange for "${req.gameTitle}". Please confirm in the app once you have received it! 🎲`;
  };

  const handleCopyNudge = (req: BorrowRequest) => {
    const text = getNudgeText(req);
    navigator.clipboard.writeText(text);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (req: BorrowRequest) => {
    const text = getNudgeText(req);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSMS = (req: BorrowRequest) => {
    const text = getNudgeText(req);
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  };

  const formatTimeAgo = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 3600));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 flex flex-col max-h-[92dvh] pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Borrow Exchanges & Activity
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {activeRequests.length} active exchange{activeRequests.length === 1 ? '' : 's'} in progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900 gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'active'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Active Exchanges ({activeRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'completed'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Completed ({completedRequests.length})
            </button>
          </div>

          {activeHousehold && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              Profile: <strong className="text-zinc-800 dark:text-zinc-200">{activeHousehold}</strong>
            </span>
          )}
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'active' ? (
            activeRequests.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">No pending borrow exchanges</p>
                <p className="mt-1">All borrowed games are currently with their holders with no pending requests.</p>
              </div>
            ) : (
              <>
                {/* 1. Action Required for Active Profile */}
                {myActionableRequests.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                        </span>
                        <span>Action Required from {activeHousehold || 'You'} ({myActionableRequests.length})</span>
                      </div>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                        Affects Badge Count
                      </span>
                    </div>

                    {myActionableRequests.map((req) => renderRequestCard(req, true))}
                  </div>
                )}

                {/* 2. Outgoing requests submitted by Active Profile (Waiting on friends) */}
                {myWaitingRequests.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 pb-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Waiting on Friends ({myWaitingRequests.length})</span>
                    </div>

                    {myWaitingRequests.map((req) => renderRequestCard(req, false))}
                  </div>
                )}

                {/* 3. Other Group Requests (between other households) */}
                {otherGroupRequests.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 pb-1">
                      <Handshake className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Other Friends&apos; Activity ({otherGroupRequests.length})</span>
                    </div>

                    {otherGroupRequests.map((req) => renderRequestCard(req, false))}
                  </div>
                )}

                {/* If activeHousehold not set, prompt */}
                {!activeHousehold && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
                    <span>Select your household in the top bar to tailor your badge alerts and action buttons.</span>
                  </div>
                )}
              </>
            )
          ) : (
            /* Completed exchanges tab */
            completedRequests.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <History className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <p className="font-semibold text-zinc-600 dark:text-zinc-400">No completed exchanges yet</p>
              </div>
            ) : (
              completedRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100">{req.gameTitle}</h5>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Transferred from <strong>{req.holderName}</strong> to <strong>{req.requesterName}</strong>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
