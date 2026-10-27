'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Plus, 
  Bell, 
  UserCheck, 
  ArrowRightLeft 
} from 'lucide-react';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  pendingRequestsCount: number;
  activeHousehold: string | null;
  onOpenAddModal: () => void;
  onOpenNotifications: () => void;
  onOpenIdentityModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  onViewModeChange,
  pendingRequestsCount,
  activeHousehold,
  onOpenAddModal,
  onOpenNotifications,
  onOpenIdentityModal,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 pb-safe shadow-lg">
      <div className="grid grid-cols-5 h-14 items-center px-1">
        
        {/* Covers Grid View */}
        <button
          type="button"
          onClick={() => onViewModeChange('bookshelf')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            viewMode === 'bookshelf'
              ? 'text-zinc-900 dark:text-zinc-100 font-bold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium'
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Covers</span>
        </button>

        {/* Table View */}
        <button
          type="button"
          onClick={() => onViewModeChange('table')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            viewMode === 'table'
              ? 'text-zinc-900 dark:text-zinc-100 font-bold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium'
          }`}
        >
          <TableIcon className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Table</span>
        </button>

        {/* Center Prominent Add Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-md active:scale-95 transition-transform"
            title="Add game or BGG Sync"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Activity & Exchanges with Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative flex flex-col items-center justify-center h-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium transition-colors"
        >
          <div className="relative">
            <Bell className="w-4 h-4 mb-0.5" />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs ring-1 ring-white dark:ring-zinc-950 animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Activity</span>
        </button>

        {/* Household Identity */}
        <button
          type="button"
          onClick={onOpenIdentityModal}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeHousehold
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium'
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] truncate max-w-[55px]">
            {activeHousehold ? activeHousehold.split('&')[0].trim() : 'Profile'}
          </span>
        </button>

      </div>
    </nav>
  );
};
