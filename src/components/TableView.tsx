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
  Sparkles,
  ArrowRightLeft,
  Check,
  PackageCheck
} from 'lucide-react';

interface TableViewProps {
  games: Game[];
  activeHousehold?: string;
  activeHouseholdUser?: string | null;
  onSelectGame: (game: Game) => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow?: (game: Game) => void;
  onAcceptExchange?: (requestId: string) => void;
  onConfirmExchange?: (requestId: string) => void;
  onResetFilters: () => void;
  onAddForHousehold?: (household: string) => void;
  onEdit?: (game: Game) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  games,
  activeHousehold,
  activeHouseholdUser,
  onSelectGame,
  onBorrow,
  onReturn,
  onRequestBorrow,
  onAcceptExchange,
  onConfirmExchange,
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
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Table Header */}
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-3">BGG Rank</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Players</th>
                <th className="py-3 px-3">Playtime</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Weight</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {games.map((game) => {
                const isAvailable = game.status === 'available';
                const activeExchange = (game.borrowRequests || []).find(
                  (r) => r.status === 'pending' || r.status === 'accepted'
                );

                const isUserHolder = activeHouseholdUser && activeExchange && activeHouseholdUser.toLowerCase() === activeExchange.holderName.toLowerCase();
                const isUserRequester = activeHouseholdUser && activeExchange && activeHouseholdUser.toLowerCase() === activeExchange.requesterName.toLowerCase();

                return (
                  <tr 
                    key={game.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                  >
                    
                    {/* Title & Notes */}
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex flex-col">
                        <span 
                          onClick={() => onSelectGame(game)}
                          className="font-bold text-xs hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {game.title}
                          {game.year && (
                            <span className="text-zinc-400 font-normal text-[10px]">({game.year})</span>
                          )}
                        </span>
                        {game.notes && (
                          <span className="text-[10px] text-zinc-400 italic line-clamp-1 mt-0.5">
                            &ldquo;{game.notes}&rdquo;
                          </span>
                        )}
                      </div>
                    </td>

                    {/* BGG Rank */}
                    <td className="py-3 px-3 text-zinc-500 font-mono">
                      {game.bggRank ? `#${game.bggRank}` : '—'}
                    </td>

                    {/* Rating */}
                    <td className="py-3 px-3">
                      {game.bggRating ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-amber-500" />
                          {game.bggRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Players */}
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-400" />
                        {game.minPlayers === game.maxPlayers ? `${game.minPlayers}p` : `${game.minPlayers}–${game.maxPlayers}p`}
                      </span>
                    </td>

                    {/* Playtime */}
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {game.playtimeDisplay}
                      </span>
                    </td>

                    {/* Type badge */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {game.type}
                      </span>
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
                      {activeExchange ? (
                        activeExchange.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            <ArrowRightLeft className="w-3 h-3" />
                            Exchange: With {activeExchange.holderName} ➔ {activeExchange.requesterName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 animate-pulse">
                            <PackageCheck className="w-3 h-3" />
                            Ready for {activeExchange.requesterName} confirm
                          </span>
                        )
                      ) : isAvailable ? (
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
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {activeExchange ? (
                          activeExchange.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onAcceptExchange) {
                                  onAcceptExchange(activeExchange.id);
                                } else {
                                  onSelectGame(game);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold shadow-xs transition-colors ${
                                isUserHolder
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              }`}
                              title="Accept exchange hand-off"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              {isUserHolder ? 'Accept Exchange' : 'Pending Accept'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (onConfirmExchange) {
                                  onConfirmExchange(activeExchange.id);
                                } else {
                                  onSelectGame(game);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold shadow-xs transition-colors ${
                                isUserRequester
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                              title="Confirm receipt of game"
                            >
                              <Check className="w-3 h-3" />
                              {isUserRequester ? 'Confirm Received' : 'Awaiting Receipt'}
                            </button>
                          )
                        ) : isAvailable ? (
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
                              title="Mark as returned to owner"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </button>
                            <button
                              type="button"
                              onClick={() => onBorrow(game)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-semibold transition-colors"
                              title="Request to borrow from current holder"
                            >
                              <SendHorizontal className="w-3 h-3" />
                              Borrow
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
