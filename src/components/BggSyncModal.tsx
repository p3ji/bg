'use client';

import React, { useState, useMemo } from 'react';
import { Game } from '@/types';
import { OWNER_GROUPS } from '@/data/friends';
import { matchesGameSearch } from '@/lib/search';
import { 
  X, 
  RefreshCw, 
  Search, 
  Plus, 
  Check, 
  Sparkles,
  AlertCircle,
  UserCheck,
  Hand,
  RotateCcw,
  SendHorizontal,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { useModalA11y } from '@/lib/useModalA11y';

interface BggSyncModalProps {
  isOpen: boolean;
  games?: Game[];
  friends?: string[];
  onClose: () => void;
  onAddGame: (game: Omit<Game, 'id' | 'status' | 'history'>) => void;
  onBatchImportGames: (games: Omit<Game, 'id' | 'status' | 'history'>[]) => void;
  onSelectGame?: (game: Game) => void;
  onBorrow?: (game: Game) => void;
  onReturn?: (game: Game) => void;
  initialHousehold?: string;
  initialTab?: 'library' | 'search' | 'sync';
}

interface BggGameCandidate {
  bggId?: number | null;
  title: string;
  year?: number | null;
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  maxPlaytime?: number;
  playtimeDisplay?: string;
  type?: string;
  bggRating?: number | null;
  bggRank?: number | null;
  weight?: number | null;
  image?: string | null;
  thumbnail?: string | null;
}

export const BggSyncModal: React.FC<BggSyncModalProps> = ({
  isOpen,
  games = [],
  friends,
  onClose,
  onAddGame,
  onBatchImportGames,
  onSelectGame,
  onBorrow,
  onReturn,
  initialHousehold,
  initialTab = 'library',
}) => {
  const availableHouseholds = useMemo(
    () => (friends && friends.length > 0 ? friends : OWNER_GROUPS),
    [friends]
  );

  // Top-level tab: 'library' (a: Search for game) | 'add' (b: Add game)
  const [mainTab, setMainTab] = useState<'library' | 'add'>(
    initialTab === 'library' ? 'library' : 'add'
  );
  // Sub-mode inside 'add' tab: 'search' (Search & Add from BGG) | 'sync' (Import from BGG Profile)
  const [addSubTab, setAddSubTab] = useState<'search' | 'sync'>(
    initialTab === 'sync' ? 'sync' : 'search'
  );

  // Tab A: Search Library state
  const [libraryQuery, setLibraryQuery] = useState('');

  // Tab B (Sync): Import from BGG Profile state
  const [username, setUsername] = useState('');
  const [syncOwner, setSyncOwner] = useState(initialHousehold || availableHouseholds[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedGames, setSyncedGames] = useState<BggGameCandidate[]>([]);
  const [selectedToImport, setSelectedToImport] = useState<Set<number>>(new Set());

  // Tab B (Search): BGG Search & Add state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<BggGameCandidate[]>([]);
  const [searchOwner, setSearchOwner] = useState(initialHousehold || availableHouseholds[0]);
  const [searchAddedIds, setSearchAddedIds] = useState<Set<string>>(new Set());

  useModalA11y(isOpen, onClose);

  React.useEffect(() => {
    if (isOpen) {
      const defaultOwner = initialHousehold || availableHouseholds[0];
      setSearchOwner(defaultOwner);
      setSyncOwner(defaultOwner);
      setLibraryQuery('');
      setUsername('');
      setSyncError(null);
      setSearchError(null);
      setSyncedGames([]);
      setSelectedToImport(new Set());
      if (initialTab === 'library') {
        setMainTab('library');
      } else {
        setMainTab('add');
        setAddSubTab(initialTab === 'sync' ? 'sync' : 'search');
      }
    }
  }, [isOpen, initialHousehold, initialTab, availableHouseholds]);

  const matchingLibraryGames = useMemo(() => {
    const q = libraryQuery.trim();
    if (!q) return games.slice(0, 30);
    return games.filter((g) => matchesGameSearch(q, g));
  }, [games, libraryQuery]);

  if (!isOpen) return null;

  const runBggSearchQuery = async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        throw new Error(`Search returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
      setSearchError('Could not reach BoardGameGeek search right now. You can still add the game directly below.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJumpToBggAdd = (queryToCarry: string) => {
    setMainTab('add');
    setAddSubTab('search');
    if (queryToCarry.trim()) {
      setSearchQuery(queryToCarry.trim());
      runBggSearchQuery(queryToCarry.trim());
    }
  };

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
      setSelectedToImport(new Set((data.games || []).map((_: BggGameCandidate, idx: number) => idx)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during BGG sync.';
      setSyncError(message);
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
      .map((g) => {
        const minP = g.minPlayers || 1;
        const maxP = Math.max(minP, g.maxPlayers || 4);
        const minT = g.minPlaytime || 30;
        const maxT = Math.max(minT, g.maxPlaytime || 60);
        return {
          title: g.title,
          owner: syncOwner,
          minPlayers: minP,
          maxPlayers: maxP,
          minPlaytime: minT,
          maxPlaytime: maxT,
          playtimeDisplay: g.playtimeDisplay || (minT === maxT ? `${minT}m` : `${minT}-${maxT}m`),
          type: g.type || 'Board Game',
          notes: `Imported from BGG (${username})`,
          bggId: g.bggId || null,
          bggRating: g.bggRating || null,
          bggRank: g.bggRank || null,
          weight: g.weight || null,
          image: g.image || g.thumbnail || null,
          thumbnail: g.thumbnail || g.image || null,
          description: null,
        };
      });

    if (toImport.length > 0) {
      onBatchImportGames(toImport);
      onClose();
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runBggSearchQuery(searchQuery);
  };

  const handleAddSearchResult = (result: BggGameCandidate) => {
    const minP = result.minPlayers || 2;
    const maxP = Math.max(minP, result.maxPlayers || 4);
    const minT = result.minPlaytime || 30;
    const maxT = Math.max(minT, result.maxPlaytime || 60);
    onAddGame({
      title: result.title,
      owner: searchOwner,
      minPlayers: minP,
      maxPlayers: maxP,
      minPlaytime: minT,
      maxPlaytime: maxT,
      playtimeDisplay: minT === maxT ? `${minT}m` : `${minT}-${maxT}m`,
      type: result.type || 'Board Game',
      notes: 'Added from BGG Search',
      bggId: result.bggId || null,
      bggRating: result.bggRating || null,
      bggRank: result.bggRank || null,
      weight: result.weight || null,
      image: result.image || result.thumbnail || null,
      thumbnail: result.thumbnail || result.image || null,
    });
    setSearchAddedIds((prev) => new Set(prev).add(String(result.bggId || result.title)));
  };

  const handleAddCustomGame = () => {
    const title = searchQuery.trim();
    if (!title) return;
    onAddGame({
      title,
      owner: searchOwner,
      minPlayers: 2,
      maxPlayers: 4,
      minPlaytime: 30,
      maxPlaytime: 60,
      playtimeDisplay: '30-60m',
      type: 'Board Game',
      notes: 'Custom title',
      bggId: null,
      bggRating: null,
      bggRank: null,
      weight: null,
      image: null,
      thumbnail: null,
    });
    setSearchAddedIds((prev) => new Set(prev).add(title));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bgg-sync-modal-title"
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 flex flex-col max-h-[92dvh] pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 id="bgg-sync-modal-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Search & Add Games
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Find games in your circle or add new games via BoardGameGeek
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

        {/* Primary 2-Tab Switcher: a) Search for game | b) Add game */}
        <div className="grid grid-cols-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 shrink-0">
          <button
            type="button"
            onClick={() => setMainTab('library')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              mainTab === 'library'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search for Game</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('add')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              mainTab === 'add'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Game</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {mainTab === 'library' ? (
            /* TAB A: SEARCH FOR GAME IN LIBRARY */
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Search games in your circle by title, category, owner, notes..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
                {libraryQuery && (
                  <button
                    type="button"
                    onClick={() => setLibraryQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 px-0.5">
                <span>
                  {libraryQuery.trim()
                    ? `${matchingLibraryGames.length} matching game${matchingLibraryGames.length === 1 ? '' : 's'} in library`
                    : `Showing ${matchingLibraryGames.length} of ${games.length} library games`}
                </span>
              </div>

              {matchingLibraryGames.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-[52dvh] overflow-y-auto">
                  {matchingLibraryGames.map((game) => {
                    const isAvailable = game.status === 'available';
                    const imgUrl = game.thumbnail || game.image;
                    const playerLabel =
                      game.minPlayers === game.maxPlayers
                        ? `${game.minPlayers}p`
                        : `${game.minPlayers}–${game.maxPlayers}p`;

                    return (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (onSelectGame) {
                            onSelectGame(game);
                            onClose();
                          }
                        }}
                        className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {imgUrl ? (
                            <div className="w-11 h-11 relative rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-900">
                              <Image
                                src={imgUrl}
                                alt={game.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 px-1 text-center leading-tight">
                              {game.title.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {game.title}
                              </h4>
                              {isAvailable ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                                  With {game.owner}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                                  With {game.currentBorrower}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>{playerLabel}</span>
                              <span>•</span>
                              <span>{game.playtimeDisplay}</span>
                              {game.type && (
                                <>
                                  <span>•</span>
                                  <span>{game.type}</span>
                                </>
                              )}
                              {game.bggRating && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500 font-bold">★ {game.bggRating.toFixed(1)}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Quick Action Button */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAvailable ? (
                            onBorrow && (
                              <button
                                type="button"
                                onClick={() => {
                                  onBorrow(game);
                                  onClose();
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                              >
                                <Hand className="w-3 h-3" />
                                <span>Borrow</span>
                              </button>
                            )
                          ) : (
                            <>
                              {onReturn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onReturn(game);
                                    onClose();
                                  }}
                                  className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Return</span>
                                </button>
                              )}
                              {onBorrow && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onBorrow(game);
                                    onClose();
                                  }}
                                  className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  <SendHorizontal className="w-3 h-3" />
                                  <span>Req</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4">
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    No library games match &quot;{libraryQuery}&quot;
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Want to add it to a household collection from BoardGameGeek?
                  </p>
                </div>
              )}

              {/* 1-Tap Bridge to Tab B (Add Game) */}
              {libraryQuery.trim() && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Not in the circle yet?
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      Search BoardGameGeek to add &quot;{libraryQuery.trim()}&quot;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJumpToBggAdd(libraryQuery)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <span>Add &quot;{libraryQuery.trim()}&quot;</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* TAB B: ADD GAME (Search & Add + Import from BGG Profile) */
            <div className="space-y-4">
              {/* Sub-navigation inside Add Game */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAddSubTab('search')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    addSubTab === 'search'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Search & Add Game</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddSubTab('sync')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    addSubTab === 'sync'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Import from BGG</span>
                </button>
              </div>

              {addSubTab === 'sync' ? (
                <div className="space-y-4">
                  {/* Explanatory Banner */}
                  <div className="bg-zinc-100 dark:bg-zinc-800/70 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                      📥 One-way import from BoardGameGeek.com:
                    </p>
                    <p>
                      This pulls games marked as owned on BGG into your household library. If you just want to add a single game, use <strong>Search & Add Game</strong>!
                    </p>
                  </div>
                  
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
                          placeholder="Enter BGG username..."
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
                          {availableHouseholds.map((grp) => (
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
                        {isSyncing ? 'Fetching from BGG...' : 'Import Collection'}
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
                /* Search & Add Sub-Tab */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                      <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Assign added games to: <strong className="text-zinc-900 dark:text-zinc-50">{searchOwner}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-500">Change:</span>
                      <select
                        value={searchOwner}
                        onChange={(e) => setSearchOwner(e.target.value)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                      >
                        {availableHouseholds.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search BGG to add game for ${searchOwner}...`}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors shadow-xs"
                    >
                      {isSearching ? 'Searching...' : 'Search BGG'}
                    </button>
                  </form>

                  {searchError && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      {searchResults.map((res, idx) => {
                        const isAdded = searchAddedIds.has(String(res.bggId || res.title));
                        const imgUrl = res.thumbnail || res.image;
                        return (
                          <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {imgUrl ? (
                                <div className="w-12 h-12 relative rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-950">
                                  <Image 
                                    src={imgUrl} 
                                    alt={res.title} 
                                    fill 
                                    className="object-cover" 
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-base shrink-0">
                                  🎲
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {res.title} {res.year && <span className="font-normal text-zinc-400">({res.year})</span>}
                                </h4>
                                <p className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                  <span>{res.minPlayers ? `${res.minPlayers}–${res.maxPlayers} players` : '2–4 players'}</span>
                                  <span>•</span>
                                  <span>{res.playtimeDisplay || `${res.minPlaytime || 30}-${res.maxPlaytime || 60}m`}</span>
                                  {res.bggRating && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-500 font-bold">★ {res.bggRating}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddSearchResult(res)}
                              disabled={isAdded}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                                isAdded
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 cursor-not-allowed'
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

                  {/* Direct / Custom Addition Fallback Card */}
                  {hasSearched && (
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {searchResults.length === 0 ? `No BGG matches for "${searchQuery}"` : "Don't see your specific edition?"}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Add &quot;{searchQuery}&quot; directly as a game to <strong>{searchOwner}</strong>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomGame}
                        disabled={searchAddedIds.has(searchQuery.trim())}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors ${
                          searchAddedIds.has(searchQuery.trim())
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs'
                        }`}
                      >
                        {searchAddedIds.has(searchQuery.trim()) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {searchAddedIds.has(searchQuery.trim()) ? 'Added' : `Add "${searchQuery}"`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
