'use client';

import React, { useState, useEffect } from 'react';
import { Game } from '@/types';
import { 
  X, 
  SendHorizontal, 
  Calendar, 
  User, 
  Check, 
  CheckCircle2, 
  ArrowRight,
  MessageCircle, 
  Smartphone, 
  Copy,
  Zap,
  ShieldCheck,
  PackageCheck,
  Bell
} from 'lucide-react';
import { requestBadgeNotificationPermission, getNotificationPermissionStatus } from '@/lib/badgeManager';

interface BorrowModalProps {
  game: Game | null;
  friends: string[];
  isOpen: boolean;
  activeHousehold?: string | null;
  onClose: () => void;
  onRequestExchange: (gameId: string, requester: string, returnDate?: string, notes?: string) => void;
  onDirectBorrow?: (gameId: string, borrower: string, returnDate?: string, notes?: string) => void;
}

export const BorrowModal: React.FC<BorrowModalProps> = ({
  game,
  friends,
  isOpen,
  activeHousehold,
  onClose,
  onRequestExchange,
  onDirectBorrow,
}) => {
  const [borrower, setBorrower] = useState('');
  const [customName, setCustomName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedRequester, setSubmittedRequester] = useState('');
  const [copied, setCopied] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');

  // Group that currently holds the game
  const currentHolder = game
    ? (game.status === 'borrowed' && game.currentBorrower ? game.currentBorrower : game.owner)
    : '';

  useEffect(() => {
    if (isOpen) {
      setPermissionStatus(getNotificationPermissionStatus());
      if (activeHousehold) {
        setBorrower(activeHousehold);
      } else {
        setBorrower('');
      }
      setCustomName('');
      setReturnDate('');
      setNotes('');
      setIsSubmitted(false);
      setSubmittedRequester('');
      setCopied(false);
    }
  }, [isOpen, activeHousehold]);

  if (!isOpen || !game) return null;

  const effectiveRequester = (borrower === 'other' ? customName : borrower).trim();

  const handleQuickDuration = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setReturnDate(target.toISOString().split('T')[0]);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveRequester) return;

    onRequestExchange(game.id, effectiveRequester, returnDate || undefined, notes || undefined);
    setSubmittedRequester(effectiveRequester);
    setIsSubmitted(true);
  };

  const handleDirectLend = () => {
    if (!effectiveRequester || !onDirectBorrow) return;
    onDirectBorrow(game.id, effectiveRequester, returnDate || undefined, notes || undefined);
    onClose();
  };

  const nudgeMessage = `Hey ${currentHolder}! ${submittedRequester || effectiveRequester} requested to borrow "${game.title}" from our game library. Please accept the exchange in the app to coordinate hand-off! 🎲`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(nudgeMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(nudgeMessage)}`;
    window.open(url, '_blank');
  };

  const handleSMS = () => {
    const url = `sms:?&body=${encodeURIComponent(nudgeMessage)}`;
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-safe sm:pb-0 animate-in slide-in-from-bottom duration-200 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <SendHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Borrow Game & Exchange
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {game.title}
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

        {/* Body */}
        {isSubmitted ? (
          /* Step 1 Confirmed Screen: Request Sent */
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Borrow Request Sent to {currentHolder}!
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                A notification was sent to <strong>{currentHolder}</strong>. The exchange will complete once they accept and you confirm receipt.
              </p>
            </div>

            {/* Handshake Progress indicator */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-bold">1</span>
                <span>Request sent by {submittedRequester}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 pl-7">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span>Waiting for <strong>{currentHolder}</strong> to accept (execute exchange)</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 pl-7">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span>{submittedRequester} confirms receipt & game transfers</span>
              </div>
            </div>

            {/* Quick Nudge Actions */}
            <div>
              <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Ping {currentHolder} to coordinate handoff:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleSMS}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  iMessage / SMS
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Nudge to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Nudge Message
                  </>
                )}
              </button>
            </div>

            {/* Phone Home Screen Badge Prompt if permission not yet granted */}
            {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-300 text-[11px]">
                    Show red notification badge on your phone&apos;s app icon?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await requestBadgeNotificationPermission();
                    if (ok) setPermissionStatus('granted');
                  }}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-[11px] shrink-0 shadow-xs transition-colors"
                >
                  Enable Badge
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
              >
                Done • View on Home Screen
              </button>
            </div>
          </div>
        ) : (
          /* Form: Configure Borrow Request */
          <form onSubmit={handleSubmitRequest} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            
            {/* Current Holder banner */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold block text-[11px] uppercase tracking-wider">
                  Currently Held By
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {currentHolder}
                </span>
                <span className="text-[11px] text-zinc-500 ml-1.5">
                  ({game.status === 'borrowed' ? 'Current Borrower' : 'Owner'})
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Handshake flow explainer */}
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>2-Step Verified Exchange Flow:</span>
              </div>
              <p>
                1. Clicking <strong>Send Borrow Request</strong> notifies <strong>{currentHolder}</strong>.
                <br />
                2. Once they accept (execute exchange) and you confirm receipt, the game will be transferred to you.
              </p>
            </div>

            {/* Household Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Who wants to borrow this game?
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {friends.map((f) => {
                  const isCurrentHolder = f.toLowerCase() === currentHolder.toLowerCase();
                  const isSelected = borrower === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setBorrower(f);
                        setCustomName('');
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                      title={isCurrentHolder ? `${f} currently holds this game (select to test handshake)` : undefined}
                    >
                      {f}
                      {isCurrentHolder && <span className="text-[10px] opacity-75 ml-1 font-normal">(Current holder)</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setBorrower('other')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    borrower === 'other'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800'
                  }`}
                >
                  + Other
                </button>
              </div>

              {borrower === 'other' && (
                <div className="relative mt-2">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter borrower / household name..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* Target Return Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Target return date (optional)
              </label>
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => handleQuickDuration(7)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"
                >
                  1 Week
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(14)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"
                >
                  2 Weeks
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(30)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"
                >
                  1 Month
                </button>
              </div>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
            </div>

            {/* Optional notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Note to {currentHolder} (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Planning for Saturday family game night!"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            {/* Submit buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!effectiveRequester}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  Send Borrow Request to {currentHolder}
                </button>
              </div>

              {/* Direct Lend option if in-person */}
              {onDirectBorrow && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
                  <button
                    type="button"
                    onClick={handleDirectLend}
                    disabled={!effectiveRequester}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 disabled:opacity-40 transition-colors"
                    title="Directly mark as handed over right now without awaiting handshake"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>In person right now? Skip handshake & direct mark</span>
                  </button>
                </div>
              )}
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
