'use client';

import React, { useState, useEffect } from 'react';
import { Game } from '@/types';
import { OWNER_GROUPS, GAME_TYPES } from '@/data/friends';
import { GameBoxCover } from './GameBoxCover';
import { 
  X, 
  Search, 
  Link as LinkIcon, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  Loader2, 
  ExternalLink,
  RefreshCw,
  Users,
  Clock
} from 'lucide-react';

interface EditGameModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGame: Game) => void;
}

interface BggSearchResult {
  bggId: number;
  title: string;
  year?: number;
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  maxPlaytime?: number;
  image?: string;
  thumbnail?: string;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  game,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [type, setType] = useState('Strategy');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [minPlaytime, setMinPlaytime] = useState(30);
  const [maxPlaytime, setMaxPlaytime] = useState(60);
  const [notes, setNotes] = useState('');
  
  // Image and BGG fields
  const [image, setImage] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [bggId, setBggId] = useState<number | undefined>(undefined);
  
  // BGG search & lookup state
  const [bggSearchQuery, setBggSearchQuery] = useState('');
  const [isSearchingBgg, setIsSearchingBgg] = useState(false);
  const [bggSearchResults, setBggSearchResults] = useState<BggSearchResult[]>([]);
  const [bggSearchError, setBggSearchError] = useState<string | null>(null);
  const [syncBggStats, setSyncBggStats] = useState(true);

  useEffect(() => {
    if (game) {
      setTitle(game.title || '');
      setOwner(game.owner || OWNER_GROUPS[0]);
      setType(game.type || 'Strategy');
      setMinPlayers(game.minPlayers || 2);
      setMaxPlayers(game.maxPlayers || 4);
      setMinPlaytime(game.minPlaytime || 30);
      setMaxPlaytime(game.maxPlaytime || 60);
      setNotes(game.notes || '');
      setImage(game.image || '');
      setThumbnail(game.thumbnail || '');
      setBggId(game.bggId ?? undefined);
      setBggSearchQuery(game.bggId ? String(game.bggId) : game.title || '');
      setBggSearchResults([]);
      setBggSearchError(null);
    }
  }, [game, isOpen]);

  if (!isOpen || !game) return null;

  const handleSearchBgg = async () => {
    const query = bggSearchQuery.trim();
    if (!query) return;

    setIsSearchingBgg(true);
    setBggSearchError(null);
    setBggSearchResults([]);

    try {
      // If user typed a number or BGG URL, lookup by ID
      const idMatch = query.match(/(?:boardgame\/|^)(\d+)(?:\/|$)/);
      if (idMatch && idMatch[1]) {
        const lookupRes = await fetch(`/api/bgg/lookup?id=${idMatch[1]}`);
        if (lookupRes.ok) {
          const data = await lookupRes.json();
          if (data.bggId) {
            setBggSearchResults([data]);
            setIsSearchingBgg(false);
            return;
          }
        }
      }

      // Otherwise search
      const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error('Search failed');
      }
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setBggSearchResults(data.results);
      } else {
        setBggSearchError(`No BGG matches found for "${query}". You can also paste the numeric BGG ID directly.`);
      }
    } catch (err: any) {
      setBggSearchError(err.message || 'Failed to search BoardGameGeek');
    } finally {
      setIsSearchingBgg(false);
    }
  };

  const handleApplyBggResult = async (result: BggSearchResult) => {
    // If we only have basic info without high-res image, do a quick lookup
    let fullItem = result;
    if (!result.image && result.bggId) {
      try {
        const res = await fetch(`/api/bgg/lookup?id=${result.bggId}`);
        if (res.ok) {
          const data = await res.json();
          fullItem = data;
        }
      } catch (err) {
        console.error('Failed to lookup full BGG item:', err);
      }
    }

    if (fullItem.image) {
      setImage(fullItem.image);
    }
    if (fullItem.thumbnail) {
      setThumbnail(fullItem.thumbnail);
    }
    if (fullItem.bggId) {
      setBggId(fullItem.bggId);
    }

    if (syncBggStats) {
      if (fullItem.minPlayers) setMinPlayers(fullItem.minPlayers);
      if (fullItem.maxPlayers) setMaxPlayers(fullItem.maxPlayers);
      if (fullItem.minPlaytime) setMinPlaytime(fullItem.minPlaytime);
      if (fullItem.maxPlaytime) setMaxPlaytime(fullItem.maxPlaytime);
    }

    setBggSearchResults([]);
  };

  const handleSave = () => {
    const updatedGame: Game = {
      ...game,
      title: title.trim(),
      owner,
      type,
      minPlayers: Number(minPlayers) || 1,
      maxPlayers: Number(maxPlayers) || 4,
      minPlaytime: Number(minPlaytime) || 15,
      maxPlaytime: Number(maxPlaytime) || 60,
      notes: notes.trim(),
      image: image.trim() || null,
      thumbnail: thumbnail.trim() || image.trim() || null,
      bggId: bggId || undefined,
    };

    onSave(updatedGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Edit Game & Image Cover
              </h2>
              <p className="text-xs text-zinc-500">
                Connect to BoardGameGeek or customize box art
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Section: Live Preview & BGG Connect */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Box Art Preview */}
            <div className="md:col-span-4 flex flex-col items-center">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 self-start">
                Live Box Preview
              </span>
              <div className="w-44 h-56 rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
                <GameBoxCover
                  title={title || 'Untitled Game'}
                  image={image}
                  thumbnail={thumbnail}
                  type={type}
                  minPlayers={minPlayers}
                  maxPlayers={maxPlayers}
                  playtimeDisplay={`${minPlaytime}–${maxPlaytime}m`}
                  className="w-full h-full"
                />
              </div>
              {image && (
                <button
                  type="button"
                  onClick={() => {
                    setImage('');
                    setThumbnail('');
                  }}
                  className="mt-2 text-[11px] text-red-500 hover:text-red-600 underline"
                >
                  Clear Image
                </button>
              )}
            </div>

            {/* BGG Connect & Search */}
            <div className="md:col-span-8 space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Connect to BoardGameGeek (BGG)</span>
                  </div>
                  {bggId && (
                    <a
                      href={`https://boardgamegeek.com/boardgame/${bggId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      BGG #{bggId}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-3">
                  Search by game name or enter a numeric BGG ID to pull the official high-res cover art.
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bggSearchQuery}
                      onChange={(e) => setBggSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchBgg()}
                      placeholder="e.g. Splendor, Wingspan, or BGG ID (148228)"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchBgg}
                    disabled={isSearchingBgg || !bggSearchQuery.trim()}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {isSearchingBgg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isSearchingBgg ? 'Searching...' : 'Find on BGG'}</span>
                  </button>
                </div>

                {/* Sync stats option */}
                <label className="flex items-center gap-2 mt-2 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncBggStats}
                    onChange={(e) => setSyncBggStats(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Also update player count & playtime from BGG</span>
                </label>

                {/* Error message */}
                {bggSearchError && (
                  <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">
                    {bggSearchError}
                  </p>
                )}

                {/* Search Results list */}
                {bggSearchResults.length > 0 && (
                  <div className="mt-3 border border-indigo-200 dark:border-indigo-800/60 rounded-xl overflow-hidden divide-y divide-indigo-100 dark:divide-indigo-900/40 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900">
                    {bggSearchResults.map((res) => (
                      <div
                        key={res.bggId}
                        className="p-2.5 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {res.thumbnail ? (
                            <img
                              src={res.thumbnail}
                              alt={res.title}
                              className="w-9 h-9 object-cover rounded border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-800 rounded flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4 text-zinc-400" />
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                              {res.title}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {res.year ? `${res.year} • ` : ''}ID: #{res.bggId}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyBggResult(res)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0 transition-colors"
                        >
                          Link Cover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Image URL input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Custom Direct Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setThumbnail(e.target.value);
                  }}
                  placeholder="https://... (image link)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Bottom Section: Core Game Details */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Game Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Game Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Owner Household */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Owner Household *
                </label>
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {OWNER_GROUPS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Category / Style
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {GAME_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Players Min / Max */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Player Range (Min – Max)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="Min (e.g. 2)"
                  />
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="Max (e.g. 4)"
                  />
                </div>
              </div>

              {/* Playtime Min / Max */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Playtime Minutes (Min – Max)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={minPlaytime}
                    onChange={(e) => setMinPlaytime(Math.max(5, parseInt(e.target.value) || 15))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="Min (e.g. 30)"
                  />
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={maxPlaytime}
                    onChange={(e) => setMaxPlaytime(Math.max(5, parseInt(e.target.value) || 60))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="Max (e.g. 60)"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Edition Notes / Condition
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Big Box edition, includes expansion 1 & 2"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
