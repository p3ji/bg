'use client';

import React, { useState, useEffect } from 'react';
import { Game, BorrowRequest } from '@/types';
import { X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useModalA11y } from '@/lib/useModalA11y';
import { isSameHousehold } from '@/lib/normalize';

interface ReturnModalProps {
  game: Game | null;
  requests?: BorrowRequest[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (gameId: string, notes?: string) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  game,
  requests,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [returnNotes, setReturnNotes] = useState('');

  useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setReturnNotes('');
    }
  }, [isOpen, game?.id]);

  if (!isOpen || !game) return null;

  const gameRequests = requests
    ? requests.filter((r) => r.gameId === game.id)
    : game.borrowRequests || [];
  const pendingRequest = gameRequests.find(
    (r) => r.status === 'pending' && !isSameHousehold(r.requesterName, game.owner)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(game.id, returnNotes || undefined);
    onClose();
  };

  const getLoanDuration = () => {
    if (!game.borrowDate) return '';
    try {
      const start = new Date(game.borrowDate);
      const now = new Date();
      const diffDays = Math.max(1, Math.round((now.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
    } catch {
      return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-modal-title"
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 max-h-[92dvh] flex flex-col pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="return-modal-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Return to Library
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">Current Borrower:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{game.currentBorrower}</strong>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">Game Owner:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{game.owner}</span>
            </div>
            {game.borrowDate && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span className="font-medium">Loan Duration:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{getLoanDuration()}</span>
              </div>
            )}
          </div>

          {pendingRequest && (
            <div className="bg-indigo-50 dark:bg-indigo-950/60 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>{pendingRequest.requesterName}</strong> requested this game! Returning it now will free it up for them.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Return note / Condition (optional)
            </label>
            <input
              type="text"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="e.g. All components safe in box, awesome game!"
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Return
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
