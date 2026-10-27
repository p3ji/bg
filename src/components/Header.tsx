'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Bell, 
  PlusCircle, 
  Settings, 
  Dices, 
  CheckCircle2, 
  Clock, 
  User 
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalGames: number;
  availableCount: number;
  borrowedCount: number;
  pendingRequestsCount: number;
  actionableCount?: number;
  waitingCount?: number;
  activeHousehold: string | null;
  onOpenIdentityModal: () => void;
  onOpenNotifications: () => void;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  totalGames,
  availableCount,
  borrowedCount,
  pendingRequestsCount,
  actionableCount = 0,
  waitingCount = 0,
  activeHousehold,
  onOpenIdentityModal,
  onOpenNotifications,
  onOpenAddModal,
  onOpenSettings,
}) => {
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

  const displayBadgeCount = actionableCount > 0 ? actionableCount : (pendingRequestsCount || waitingCount);

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-30 shadow-xs pt-safe">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          
          {/* Logo & Quick Stats */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="flex items-center gap-2">
              <div 
                className="relative cursor-pointer"
                onClick={onOpenNotifications}
                title={displayBadgeCount > 0 ? `${displayBadgeCount} active borrow exchanges` : 'GameShare'}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                  <Dices className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {displayBadgeCount > 0 && (
                  <span className={`z-30 absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ring-2 ring-white dark:ring-zinc-950 ${
                    actionableCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'
                  }`}>
                    {displayBadgeCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight tracking-tight">
                  GameShare
                </h1>
                <p className="text-[10px] text-zinc-500 font-medium sm:hidden">
                  {totalGames} games
                </p>
              </div>
            </div>

            {/* Desktop Inventory Stats Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">{totalGames}</span> games
              <span className="text-zinc-400">•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-semibold">{availableCount}</span> with owners
              </span>
              <span className="text-zinc-400">•</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-semibold">{borrowedCount}</span> loaned
              </span>
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* 1-Tap Household Profile Switcher */}
            <button
              type="button"
              onClick={onOpenIdentityModal}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                activeHousehold
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                  : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
              title="Change your active household profile"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {activeHousehold ? getInitials(activeHousehold) : <User className="w-3 h-3" />}
              </div>
              <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[140px] text-left">
                {activeHousehold || 'Identity'}
              </span>
              <span className="text-[10px] opacity-60">▾</span>
            </button>

            {/* Desktop View Toggle (hidden on mobile, handled by mobile bottom bar) */}
            <div className="hidden md:flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onViewModeChange('bookshelf')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'bookshelf'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Bookshelf / Cover Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Covers</span>
              </button>
              
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Coverless Dense Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Notification Bell (desktop and mobile) */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors shrink-0"
              title="Borrow Exchanges & Notifications"
            >
              <Bell className="w-4 h-4" />
              {displayBadgeCount > 0 && (
                <span className={`z-30 absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ring-2 ring-white dark:ring-zinc-950 ${
                  actionableCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'
                }`}>
                  {displayBadgeCount}
                </span>
              )}
            </button>

            {/* Desktop Add Game Button */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Game</span>
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors shrink-0"
              title="Library Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
