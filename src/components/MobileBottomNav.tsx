'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Search, 
  Plus,
  Bell, 
  UserCheck 
} from 'lucide-react';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  pendingRequestsCount: number;
  activeHousehold: string | null;
  onOpenSearchModal: () => void;
  onOpenAddModal: () => void;
  onOpenNotifications: () => void;
  onOpenIdentityModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  onViewModeChange,
  pendingRequestsCount,
  activeHousehold,
  onOpenSearchModal,
  onOpenAddModal,
  onOpenNotifications,
  onOpenIdentityModal,
}) => {
  const isCovers = viewMode === 'bookshelf';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 pb-safe shadow-lg">
      <div className="grid grid-cols-5 h-14 items-center px-1">
        
        {/* 1. Unified Covers / Table Toggle Button */}
        <button
          type="button"
          onClick={() => onViewModeChange(isCovers ? 'table' : 'bookshelf')}
          className="flex flex-col items-center justify-center h-full text-zinc-900 dark:text-zinc-100 font-bold transition-colors active:scale-95"
          title={isCovers ? 'Switch to Table View' : 'Switch to Covers View'}
        >
          {isCovers ? (
            <>
              <LayoutGrid className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Covers</span>
            </>
          ) : (
            <>
              <TableIcon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Table</span>
            </>
          )}
        </button>

        {/* 2. Search Button */}
        <button
          type="button"
          onClick={onOpenSearchModal}
          className="flex flex-col items-center justify-center h-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium transition-colors active:scale-95"
          title="Search games in library"
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Search</span>
        </button>

        {/* 3. Center Prominent Add (+) Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-md active:scale-95 transition-transform"
            title="Add game or Import from BGG"
            aria-label="Add game or Import from BGG"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Activity & Exchanges with Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative flex flex-col items-center justify-center h-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium transition-colors"
        >
          <div className="relative">
            <Bell className="w-4 h-4 mb-0.5" />
            {pendingRequestsCount > 0 && (
              <span className="z-30 absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-1 ring-white dark:ring-zinc-950 animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Activity</span>
        </button>

        {/* 5. Household Identity */}
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
