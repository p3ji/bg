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
  Clock
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalGames: number;
  availableCount: number;
  borrowedCount: number;
  pendingRequestsCount: number;
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
  onOpenNotifications,
  onOpenAddModal,
  onOpenSettings,
}) => {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Inventory Counts */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
                <Dices className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight tracking-tight">
                  GameShare
                </h1>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Friend Circle Library
                </p>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">{totalGames}</span> games
              <span className="text-zinc-400">•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-semibold">{availableCount}</span> available
              </span>
              <span className="text-zinc-400">•</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-semibold">{borrowedCount}</span> loaned
              </span>
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* View Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
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
                <span className="hidden sm:inline">Covers</span>
              </button>
              
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Coverless Dense Table View (Easier to scan)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Coverless Table</span>
              </button>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors"
              title="Borrow Requests & Activity"
            >
              <Bell className="w-4 h-4" />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {/* Add / Sync Game Button */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">BGG Sync / Add</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
              title="Library & Friend Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
