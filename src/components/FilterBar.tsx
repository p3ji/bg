'use client';

import React from 'react';
import { FilterState } from '@/types';
import { OWNER_GROUPS, GAME_TYPES } from '@/data/friends';
import { 
  Search, 
  X, 
  Users, 
  Clock, 
  UserCheck, 
  ArrowUpDown, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  resultCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
  resultCount,
}) => {
  const isFiltered = Boolean(
    filters.search ||
    filters.exactPlayers !== null ||
    filters.maxPlaytime !== null ||
    filters.availability !== 'all' ||
    filters.owner !== 'all' ||
    filters.type !== 'all' ||
    filters.sortBy !== 'rank'
  );

  const playerOptions = [
    { label: 'Any', value: null },
    { label: '1p', value: 1 },
    { label: '2p', value: 2 },
    { label: '3p', value: 3 },
    { label: '4p', value: 4 },
    { label: '5p', value: 5 },
    { label: '6p+', value: 6 },
  ];

  const playtimeOptions = [
    { label: 'Any Time', value: null },
    { label: '≤ 30m', value: 30 },
    { label: '≤ 45m', value: 45 },
    { label: '≤ 60m', value: 60 },
    { label: '≤ 90m', value: 90 },
    { label: '≤ 120m', value: 120 },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-3.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-3">
        
        {/* Top Row: Search Input + Sorting */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Search by game title, category, or notes..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
              className="py-2 px-3 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="rank">BGG Rank (Top)</option>
              <option value="rating">BGG Rating (High to Low)</option>
              <option value="title">Title (A–Z)</option>
              <option value="playtime">Playtime (Shortest first)</option>
              <option value="weight">Complexity (Weight)</option>
              <option value="players">Max Player Count</option>
            </select>
          </div>
        </div>

        {/* Bottom Row: Filter Pills & Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          
          {/* Player Count Chips */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Players:
            </span>
            {playerOptions.map((opt) => {
              const active = filters.exactPlayers === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onChange({ ...filters, exactPlayers: opt.value })}
                  className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                    active
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Max Playtime Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Time:
            </span>
            <select
              value={filters.maxPlaytime ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                onChange({ ...filters, maxPlaytime: val });
              }}
              className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden py-0.5 px-1 cursor-pointer"
            >
              {playtimeOptions.map((opt) => (
                <option key={opt.label} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => onChange({ ...filters, availability: 'all' })}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                filters.availability === 'all'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...filters, availability: 'available' })}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                filters.availability === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              Available
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...filters, availability: 'borrowed' })}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                filters.availability === 'borrowed'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              Loaned
            </button>
          </div>

          {/* Owner Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-1.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Owner:
            </span>
            <select
              value={filters.owner}
              onChange={(e) => onChange({ ...filters, owner: e.target.value })}
              className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden py-0.5 px-1 cursor-pointer max-w-[140px]"
            >
              <option value="all">All Households</option>
              {OWNER_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* Game Type Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Type:
            </span>
            <select
              value={filters.type}
              onChange={(e) => onChange({ ...filters, type: e.target.value })}
              className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden py-0.5 px-1 cursor-pointer max-w-[130px]"
            >
              <option value="all">All Types</option>
              {GAME_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}

          {/* Result Count */}
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-auto sm:ml-0">
            Showing <strong className="text-zinc-900 dark:text-zinc-100">{resultCount}</strong> games
          </span>

        </div>

      </div>
    </div>
  );
};
