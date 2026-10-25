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
  PlusCircle
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
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Household Header Banner if filtered */}
      {activeHousehold && activeHousehold !== 'all' && (
        <div className="mb-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              {activeHousehold.split('&').map(n => n.trim()[0]).join('&')}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {activeHousehold}’s Collection
              </h3>
              <p className="text-xs text-zinc-500">
                {games.length} board game{games.length === 1 ? '' : 's'} in this household
              </p>
            </div>
          </div>
          {onAddForHousehold && (
            <button
              type="button"
              onClick={() => onAddForHousehold(activeHousehold)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Game to {activeHousehold}
            </button>
          )}
        </div>
      )}

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            
            {/* Table Header */}
            <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-4 min-w-[200px]">Game Title</th>
                <th className="py-3 px-3 min-w-[85px]">Players</th>
                <th className="py-3 px-3 min-w-[95px]">Playtime</th>
                <th className="py-3 px-3 min-w-[110px]">Type</th>
                <th className="py-3 px-3 min-w-[80px]">BGG Rank</th>
                <th className="py-3 px-3 min-w-[85px]">Rating</th>
                <th className="py-3 px-3 min-w-[80px]">Weight</th>
                <th className="py-3 px-3 min-w-[130px]">Owner</th>
                <th className="py-3 px-3 min-w-[150px]">Status</th>
                <th className="py-3 px-4 min-w-[140px] text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {games.map((game) => {
                const isAvailable = game.status === 'available';
                const hasPendingRequest = (game.borrowRequests || []).some((r) => r.status === 'pending');

                return (
                  <tr 
                    key={game.id} 
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                  >
                    
                    {/* Title & Notes */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => onSelectGame(game)}
                          className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer text-[13px]"
                        >
                          {game.title}
                        </span>
                        {game.bggId && (
                          <a
                            href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            title="Open on BoardGameGeek"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {game.notes && (
                        <p className="text-[11px] text-zinc-400 italic mt-0.5 line-clamp-1">
                          {game.notes}
                        </p>
                      )}
                    </td>

                    {/* Players */}
                    <td className="py-3 px-3 font-medium text-zinc-700 dark:text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-400" />
                        {game.minPlayers === game.maxPlayers ? `${game.minPlayers}p` : `${game.minPlayers}–${game.maxPlayers}p`}
                      </span>
                    </td>

                    {/* Playtime */}
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {game.playtimeDisplay}
                      </span>
                    </td>

                    {/* Type / Category */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60">
                        {game.type}
                      </span>
                    </td>

                    {/* BGG Rank */}
                    <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {game.bggRank ? `#${game.bggRank}` : '—'}
                    </td>

                    {/* BGG Rating */}
                    <td className="py-3 px-3">
                      {game.bggRating ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {game.bggRating.toFixed(1)}
                        </span>
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
