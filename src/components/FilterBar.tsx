'use client';

import React, { useState } from 'react';
import { FilterState } from '@/types';
import { OWNER_GROUPS, GAME_TYPES } from '@/data/friends';
import { isSameHousehold } from '@/lib/normalize';
import { 
  Search, 
  X, 
  UserCheck, 
  ArrowUpDown, 
  RotateCcw,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  friends?: string[];
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  resultCount: number;
  onAddForHousehold?: (household: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  friends,
  onChange,
  onReset,
  resultCount,
}) => {
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);
  const availableHouseholds = friends && friends.length > 0 ? friends : OWNER_GROUPS;

  const activeFilterCount = [
    Boolean(filters.search),
    filters.exactPlayers !== null,
    filters.maxPlaytime !== null,
    filters.availability !== 'all',
    filters.owner !== 'all',
    filters.type !== 'all',
  ].filter(Boolean).length;

  const handleSortByChange = (newSortBy: FilterState['sortBy']) => {
    const defaultOrder: 'asc' | 'desc' =
      newSortBy === 'rating' || newSortBy === 'weight' || newSortBy === 'players' ? 'desc' : 'asc';
    onChange({ ...filters, sortBy: newSortBy, sortOrder: defaultOrder });
  };

  const toggleSortOrder = () => {
    onChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-2.5 sm:py-3.5 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-2.5">
        
        {/* Row 1: Search Bar & Sort on Desktop (Hidden on mobile where Search lives in bottom nav) */}
        <div className="hidden sm:flex items-center gap-2">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Search title, category, notes..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-xs sm:text-sm"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Sort Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={filters.sortBy}
              onChange={(e) => handleSortByChange(e.target.value as FilterState['sortBy'])}
              className="py-2 px-3 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="rank">BGG Rank</option>
              <option value="rating">BGG Rating</option>
              <option value="title">Title</option>
              <option value="playtime">Playtime</option>
              <option value="weight">Complexity (Weight)</option>
              <option value="players">Max Player Count</option>
            </select>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="p-2 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title={filters.sortOrder === 'asc' ? 'Ascending order (click to reverse)' : 'Descending order (click to reverse)'}
              aria-label={`Sort order: ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>

        </div>

        {/* Row 2: Fast Horizontal Scrollable Quick Chips (Thumb-friendly on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpandedMobile(!isExpandedMobile)}
            className={`sm:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors shrink-0 ${
              isExpandedMobile || activeFilterCount > 0
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {/* Availability pills */}
          <button
            type="button"
            onClick={() => onChange({ ...filters, availability: 'all' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
              filters.availability === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, availability: 'available' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
              filters.availability === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600'
            }`}
          >
            With Owners
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, availability: 'borrowed' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
              filters.availability === 'borrowed'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-600'
            }`}
          >
            Loaned
          </button>

          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 shrink-0 mx-0.5" />

          {/* Quick Player counts */}
          {[1, 2, 3, 4, 5, 6].map((p) => {
            const isSelected = filters.exactPlayers === p;
            const label = p === 6 ? '6p+' : `${p}p`;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ ...filters, exactPlayers: isSelected ? null : p })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {label}
              </button>
            );
          })}

          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 shrink-0 mx-0.5" />

          {/* Quick Playtime pills */}
          {[15, 30, 60, 90].map((mins) => {
            const isSelected = filters.maxPlaytime === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => onChange({ ...filters, maxPlaytime: isSelected ? null : mins })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                ≤ {mins}m
              </button>
            );
          })}

          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 shrink-0 mx-0.5" />

          {/* Household chips */}
          {availableHouseholds.map((h) => {
            const isSelected = filters.owner !== 'all' && isSameHousehold(filters.owner, h, availableHouseholds);
            return (
              <button
                key={h}
                type="button"
                onClick={() => onChange({ ...filters, owner: isSelected ? 'all' : h })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                  isSelected
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {h}
              </button>
            );
          })}

        </div>

        {/* Expandable Filter Panel (Mobile Accordion / Desktop Detailed Row) */}
        <div className={`${isExpandedMobile ? 'block' : 'hidden sm:block'} pt-2 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-150`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
            
            {/* Household Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Household Collection:
              </label>
              <select
                value={
                  filters.owner === 'all'
                    ? 'all'
                    : availableHouseholds.find((grp) => isSameHousehold(grp, filters.owner, availableHouseholds)) || filters.owner
                }
                onChange={(e) => onChange({ ...filters, owner: e.target.value })}
                className="w-full py-2 px-2.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200"
              >
                <option value="all">All Households</option>
                {availableHouseholds.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>

            {/* Game Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Game Type / Category:
              </label>
              <select
                value={filters.type}
                onChange={(e) => onChange({ ...filters, type: e.target.value })}
                className="w-full py-2 px-2.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200"
              >
                <option value="all">All Types</option>
                {GAME_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Sort Dropdown (shown only inside expanded drawer on mobile) */}
            <div className="sm:hidden flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                Sort Order:
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleSortByChange(e.target.value as FilterState['sortBy'])}
                  className="flex-1 py-2 px-2.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200"
                >
                  <option value="rank">BGG Rank</option>
                  <option value="rating">BGG Rating</option>
                  <option value="title">Title</option>
                  <option value="playtime">Playtime</option>
                  <option value="weight">Complexity (Weight)</option>
                  <option value="players">Max Player Count</option>
                </select>
                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className="px-2.5 py-2 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 shrink-0"
                  aria-label={`Sort order: ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
            </div>

            {/* Result count & reset */}
            <div className="flex items-end justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {resultCount} {resultCount === 1 ? 'game' : 'games'} found
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
