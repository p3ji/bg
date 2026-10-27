'use client';

import React from 'react';
import { X, Check, Users, ShieldCheck } from 'lucide-react';
import { OWNER_GROUPS } from '@/data/friends';
import { isSameHousehold } from '@/lib/normalize';
import { useModalA11y } from '@/lib/useModalA11y';

interface IdentityModalProps {
  isOpen: boolean;
  friends?: string[];
  onClose: () => void;
  activeHousehold: string | null;
  onSelectHousehold: (household: string) => void;
  isInitialPrompt?: boolean;
}

export const IdentityModal: React.FC<IdentityModalProps> = ({
  isOpen,
  friends,
  onClose,
  activeHousehold,
  onSelectHousehold,
  isInitialPrompt = false,
}) => {
  useModalA11y(isOpen, () => {
    if (!isInitialPrompt) {
      onClose();
    }
  });

  if (!isOpen) return null;

  const availableHouseholds = friends && friends.length > 0 ? friends : OWNER_GROUPS;

  const getInitials = (name: string) => {
    if (name.includes('&')) {
      return name
        .split('&')
        .map((part) => part.trim()[0])
        .filter(Boolean)
        .join('&');
    }
    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getHouseholdTheme = (index: number) => {
    const themes = [
      {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500',
        badge: 'bg-emerald-600 text-white',
        text: 'text-emerald-950 dark:text-emerald-100',
      },
      {
        bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500',
        badge: 'bg-indigo-600 text-white',
        text: 'text-indigo-950 dark:text-indigo-100',
      },
      {
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 hover:border-amber-500',
        badge: 'bg-amber-600 text-white',
        text: 'text-amber-950 dark:text-amber-100',
      },
      {
        bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 hover:border-sky-500',
        badge: 'bg-sky-600 text-white',
        text: 'text-sky-950 dark:text-sky-100',
      },
    ];
    return themes[index % themes.length];
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
      onClick={() => {
        if (!isInitialPrompt) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-modal-title"
    >
      <div 
        className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 max-h-[92dvh] flex flex-col pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 id="identity-modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Who’s using this device?
              </h2>
              <p className="text-xs text-zinc-500">
                1-tap selection for requests, borrowing, & personal filters
              </p>
            </div>
          </div>
          {!isInitialPrompt && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableHouseholds.map((household, idx) => {
              const theme = getHouseholdTheme(idx);
              const isSelected = isSameHousehold(activeHousehold, household, availableHouseholds);

              return (
                <button
                  key={household}
                  type="button"
                  onClick={() => {
                    onSelectHousehold(household);
                    onClose();
                  }}
                  className={`relative p-3.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-3 group ${
                    isSelected
                      ? 'ring-2 ring-indigo-600 dark:ring-indigo-500 border-transparent bg-zinc-50 dark:bg-zinc-800/90 shadow-sm'
                      : `${theme.bg} hover:shadow-md`
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${theme.badge}`}>
                    {getInitials(household)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                      {household}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {isSelected ? 'Active Profile' : 'Tap to switch'}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Saved to your browser • No passwords needed
            </span>

            {activeHousehold && !isInitialPrompt && (
              <button
                type="button"
                onClick={onClose}
                className="font-medium text-zinc-700 dark:text-zinc-300 hover:underline"
              >
                Keep current
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
