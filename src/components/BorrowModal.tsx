'use client';

import React, { useState } from 'react';
import { Game } from '@/types';
import { X, Hand, Calendar, User, Clock, Check } from 'lucide-react';

interface BorrowModalProps {
  game: Game | null;
  friends: string[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (gameId: string, borrower: string, returnDate?: string, notes?: string) => void;
}

export const BorrowModal: React.FC<BorrowModalProps> = ({
  game,
  friends,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [borrower, setBorrower] = useState('');
  const [customName, setCustomName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !game) return null;

  const handleQuickDuration = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setReturnDate(target.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBorrower = (borrower === 'other' ? customName : borrower).trim();
    if (!finalBorrower) return;
    onConfirm(game.id, finalBorrower, returnDate || undefined, notes || undefined);
    onClose();
  };

  const selectedName = borrower === 'other' ? customName : borrower;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Hand className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Borrow Game
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {game.title} (Owned by {game.owner})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          {/* Household Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Which household is borrowing this game?
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {friends.map((f) => {
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
                  >
                    {f}
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
                  placeholder="Enter household or borrower name..."
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
              Note (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Taking it for Saturday family game night"
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Submit buttons */}
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
              disabled={!selectedName}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Borrow
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
