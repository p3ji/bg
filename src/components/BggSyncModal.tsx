'use client';

import React, { useState } from 'react';
import { Game } from '@/types';
import { OWNER_GROUPS, GAME_TYPES } from '@/data/friends';
import { 
  X, 
  RefreshCw, 
  Search, 
  Plus, 
  Check, 
  ExternalLink, 
  Star, 
  Users, 
  Clock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';

interface BggSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: Omit<Game, 'id' | 'status' | 'history'>) => void;
  onBatchImportGames: (games: Omit<Game, 'id' | 'status' | 'history'>[]) => void;
}

export const BggSyncModal: React.FC<BggSyncModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
  onBatchImportGames,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'search'>('sync');
  
  // Sync tab state
  const [username, setUsername] = useState('pizzicatoz');
  const [syncOwner, setSyncOwner] = useState(OWNER_GROUPS[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedGames, setSyncedGames] = useState<any[]>([]);
  const [selectedToImport, setSelectedToImport] = useState<Set<number>>(new Set());

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOwner, setSearchOwner] = useState(OWNER_GROUPS[0]);
  const [searchAddedIds, setSearchAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleBggSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSyncing(true);
    setSyncError(null);
    setSyncedGames([]);

    try {
      const res = await fetch(`/api/bgg/sync-user?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync BGG collection');
      }

      setSyncedGames(data.games || []);
      // Select all by default
      setSelectedToImport(new Set((data.games || []).map((_: any, idx: number) => idx)));
    } catch (err: any) {
      setSyncError(err.message || 'An error occurred during BGG sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSelectGame = (idx: number) => {
    const next = new Set(selectedToImport);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedToImport(next);
  };

  const handleConfirmBatchImport = () => {
    const toImport = syncedGames
      .filter((_, idx) => selectedToImport.has(idx))
      .map((g) => ({
        title: g.title,
        owner: syncOwner,
        minPlayers: g.minPlayers || 1,
        maxPlayers: g.maxPlayers || 4,
        minPlaytime: g.minPlaytime || 30,
        maxPlaytime: g.maxPlaytime || 60,
        playtimeDisplay: g.playtimeDisplay || `${g.minPlaytime || 30}-${g.maxPlaytime || 60} min`,
        type: g.type || 'Board Game',
        notes: `Imported from BGG (${username})`,
        bggId: g.bggId || null,
        bggRating: g.bggRating || null,
        bggRank: g.bggRank || null,
        weight: g.weight || null,
        image: g.thumbnail || null,
        thumbnail: g.thumbnail || null,
        description: null,
      }));

    if (toImport.length > 0) {
      onBatchImportGames(toImport);
      onClose();
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSearchResult = (result: any) => {
    onAddGame({
      title: result.title,
      owner: searchOwner,
      minPlayers: result.minPlayers || 2,
      maxPlayers: result.maxPlayers || 4,
      minPlaytime: result.minPlaytime || 30,
      maxPlaytime: result.maxPlaytime || 60,
      playtimeDisplay: `${result.minPlaytime || 30}-${result.maxPlaytime || 60} min`,
      type: result.type || 'Board Game',
      notes: 'Added from BGG Search',
      bggId: result.bggId || null,
      bggRating: result.bggRating || null,
      bggRank: result.bggRank || null,
      weight: result.weight || null,
      image: result.image || result.thumbnail || null,
      thumbnail: result.thumbnail || null,
    });
    setSearchAddedIds((prev) => new Set(prev).add(String(result.bggId || result.title)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                BoardGameGeek Integration
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Sync collections or search BGG titles to add into the circle
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

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 bg-zinc-50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Sync BGG Username Collection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Search & Add Individual Title
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'sync' ? (
            <div className="space-y-4">
              
              <form onSubmit={handleBggSync} className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      BGG Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. pizzicatoz"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Assign to Owner Household
                    </label>
                    <select
                      value={syncOwner}
                      onChange={(e) => setSyncOwner(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                    >
                      {OWNER_GROUPS.map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Fetching from BGG...' : 'Sync Collection'}
                  </button>
                </div>
              </form>

              {syncError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              {/* Preview of synced games */}
              {syncedGames.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <span>
                      Found {syncedGames.length} games on BGG ({selectedToImport.size} selected)
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmBatchImport}
                      disabled={selectedToImport.size === 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      Import {selectedToImport.size} Selected Games
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-72 overflow-y-auto">
                    {syncedGames.map((g, idx) => {
                      const isChecked = selectedToImport.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleSelectGame(idx)}
                          className={`p-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-zinc-50 dark:bg-zinc-800/60'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-zinc-300 text-zinc-900"
                          />
                          {g.thumbnail ? (
                            <div className="w-10 h-10 relative rounded overflow-hidden shrink-0 border border-zinc-200">
                              <Image 
                                src={g.thumbnail} 
                                alt={g.title} 
                                fill 
                                className="object-cover" 
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                              BG
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {g.title} {g.year && <span className="font-normal text-zinc-400">({g.year})</span>}
                            </h4>
                            <p className="text-[11px] text-zinc-500 flex items-center gap-2">
                              <span>{g.minPlayers}–{g.maxPlayers} players</span>
                              <span>•</span>
                              <span>{g.playtimeDisplay}</span>
                              {g.bggRating && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500 font-bold">★ {g.bggRating}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Search & Add Tab */
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search game title on BoardGameGeek..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">Assign added games to:</span>
                <select
                  value={searchOwner}
                  onChange={(e) => setSearchOwner(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md"
                >
                  {OWNER_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              {searchResults.length > 0 && (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  {searchResults.map((res, idx) => {
                    const isAdded = searchAddedIds.has(String(res.bggId || res.title));
                    return (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {res.title} {res.year && <span className="font-normal text-zinc-400">({res.year})</span>}
                          </h4>
                          <p className="text-[11px] text-zinc-500">
                            {res.minPlayers ? `${res.minPlayers}–${res.maxPlayers}p` : 'Standard box'} • {res.type || 'Board Game'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSearchResult(res)}
                          disabled={isAdded}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isAdded
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {isAdded ? 'Added' : 'Add to Circle'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
