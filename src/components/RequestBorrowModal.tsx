'use client';

import React, { useState, useEffect } from 'react';
import { Game } from '@/types';
import { 
  X, 
  SendHorizontal, 
  MessageSquare, 
  Copy, 
  Check, 
  MessageCircle, 
  Smartphone,
  CheckCircle2
} from 'lucide-react';

interface RequestBorrowModalProps {
  game: Game | null;
  friends: string[];
  isOpen: boolean;
  activeHousehold?: string | null;
  onClose: () => void;
  onSubmitRequest: (gameId: string, requester: string, note?: string) => void;
}

export const RequestBorrowModal: React.FC<RequestBorrowModalProps> = ({
  game,
  friends,
  isOpen,
  activeHousehold,
  onClose,
  onSubmitRequest,
}) => {
  const [requester, setRequester] = useState('');
  const [customName, setCustomName] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalizeName = (name?: string | null) => {
    if (!name) return '';
    return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  };

  useEffect(() => {
    if (isOpen) {
      if (activeHousehold && normalizeName(activeHousehold) !== normalizeName(game?.currentBorrower)) {
        setRequester(activeHousehold);
      } else {
        setRequester('');
      }
      setCustomName('');
      setNote('');
      setIsSubmitted(false);
    }
  }, [isOpen, activeHousehold, game]);

  if (!isOpen || !game) return null;

  const holder = game.currentBorrower || 'friend';
  const effectiveRequester = requester === 'other' ? customName : requester;

  const nudgeMessage = `Hey ${holder}! ${effectiveRequester || 'A friend'} requested to borrow "${game.title}" from the game library. Let them know when you're done with it! 🎲`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveRequester.trim()) return;
    onSubmitRequest(game.id, effectiveRequester.trim(), note || undefined);
    setIsSubmitted(true);
  };

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

  const handleClose = () => {
    setIsSubmitted(false);
    setRequester('');
    setCustomName('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <SendHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Request Borrow & Ping
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {game.title} (Currently with {holder})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isSubmitted ? (
          /* Initial Request Form */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
              This will log a pending request for <strong>{game.title}</strong> and badge the app. You can also send <strong>{holder}</strong> a 1-click nudge!
            </div>

            {/* Household Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Which household wants to borrow next?
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {friends.filter((f) => f !== holder).map((f) => {
                  const isSelected = normalizeName(requester) === normalizeName(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setRequester(f);
                        setCustomName('');
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setRequester('other')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    requester === 'other'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800'
                  }`}
                >
                  + Other
                </button>
              </div>

              {requester === 'other' && (
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter household or borrower name..."
                  autoFocus
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Message / Target Date (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Planning a game night on Friday!"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!effectiveRequester.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                Submit Request
              </button>
            </div>

          </form>
        ) : (
          /* Confirmation & 1-Click Ping Links */
          <div className="p-4 sm:p-5 space-y-4">
            
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Request logged in the app!
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/80 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 space-y-2">
              <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] block">
                Nudge message preview
              </span>
              <p className="italic text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] leading-relaxed">
                &ldquo;{nudgeMessage}&rdquo;
              </p>
            </div>

            {/* Quick 1-Click Actions */}
            <div>
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Send 1-Click Nudge to {holder}:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleSMS}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  iMessage
                </button>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
