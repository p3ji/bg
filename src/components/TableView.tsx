'use client';

import React from 'react';
import { Game } from '@/types';
import { 
  Users, 
  Clock, 
  Star, 
  ExternalLink, 
  RotateCcw, 
  Hand, 
  SendHorizontal, 
  Info,
  PackageOpen,
  PlusCircle,
  Sparkles
} from 'lucide-react';

interface TableViewProps {
  games: Game[];
  activeHousehold?: string;
  onSelectGame: (game: Game) => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow: (game: Game) => void;
  onResetFilters: () => void;
  onAddForHousehold?: (household: string) => void;
  onEdit?: (game: Game) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  games,
  activeHousehold,
  onSelectGame,
  onBorrow,
  onReturn,
  onRequestBorrow,
  onResetFilters,
  onAddForHousehold,
  onEdit,
}) => {
  if (games.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
          <PackageOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          No games match your active filters
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Try expanding player counts, resetting playtime, or clearing search criteria.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  const formatBorrowDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Household Header Banner if filtered */}
      {activeHousehold && activeHousehold !== 'all' && (
        <div className="mb-4 p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filtered by:</span>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{activeHousehold}</span>
            <span className="text-xs text-zinc-400">({games.length} games)</span>
          </div>
          {onAddForHousehold && (
            <button
              type="button"
              onClick={() => onAddForHousehold(activeHousehold)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Game to {activeHousehold}
            </button>
          )}
        </div>
      )}

      {/* Main High-Density Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            
            {/* Table Header */}
            <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
              <tr>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Players</th>
                <th className="py-3 px-3">Playtime</th>
                <th className="py-3 px-3">BGG Score</th>
                <th className="py-3 px-3">Weight</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {games.map((game) => {
                const isAvailable = game.status === 'available';
                const hasPendingRequest = (game.borrowRequests || []).some((r) => r.status === 'pending');

                return (
                  <tr 
                    key={game.id} 
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Game Title with BGG link icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectGame(game)}
                          className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors truncate max-w-xs"
                          title={game.title}
                        >
                          {game.title}
                        </button>
                        {game.bggId && (
                          <a
                            href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-indigo-500 transition-colors"
                            title={`BGG ID: ${game.bggId}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {game.notes && (
                        <p className="text-[10px] text-zinc-400 italic truncate max-w-xs mt-0.5">
                          {game.notes}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                        {game.type}
                      </span>
                    </td>

                    {/* Player Count */}
                    <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1 font-mono">
                        <Users className="w-3 h-3 text-zinc-400" />
                        {game.minPlayers === game.maxPlayers ? `${game.minPlayers}p` : `${game.minPlayers}–${game.maxPlayers}p`}
                      </span>
                    </td>

                    {/* Playtime */}
                    <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {game.playtimeDisplay}
                      </span>
                    </td>

                    {/* BGG Rating & Rank */}
                    <td className="py-3 px-3">
                      {game.bggRating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {game.bggRating.toFixed(1)}
                          </span>
                          {game.bggRank && (
                            <span className="text-[10px] text-zinc-400 font-mono ml-0.5">
                              (#{game.bggRank})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Complexity Weight */}
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 font-mono">
                      {game.weight ? `${game.weight} / 5` : '—'}
                    </td>

                    {/* Owner Household */}
                    <td className="py-3 px-3 font-semibold text-zinc-800 dark:text-zinc-200">
                      {game.owner}
                    </td>

                    {/* Status & Borrower */}
                    <td className="py-3 px-3">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            With {game.currentBorrower}
                          </span>
                          {game.borrowDate && (
                            <span className="text-[10px] text-zinc-400 pl-1">
                              Since {formatBorrowDate(game.borrowDate)}
                            </span>
                          )}
                          {hasPendingRequest && (
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 pl-1">
                              • Borrow requested
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAvailable ? (
                          <button
                            type="button"
                            onClick={() => onBorrow(game)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                          >
                            <Hand className="w-3 h-3" />
                            Borrow
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onReturn(game)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-semibold transition-colors"
                              title="Mark as returned"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestBorrow(game)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-semibold transition-colors"
                              title="Ping current holder to request"
                            >
                              <SendHorizontal className="w-3 h-3" />
                              Ping
                            </button>
                          </>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(game)}
                            className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Edit Game & Link BGG Cover"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectGame(game)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Details & History"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
};
