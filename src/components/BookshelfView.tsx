'use client';

import React from 'react';
import { Game } from '@/types';
import { GameCard } from './GameCard';
import { PackageOpen, Sparkles, PlusCircle } from 'lucide-react';

interface BookshelfViewProps {
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

export const BookshelfView: React.FC<BookshelfViewProps> = ({
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
          Try expanding player counts, resetting playtime, or clearing the search text.
        </p>
        <div className="mt-4 flex items-center gap-2">
          {activeHousehold && activeHousehold !== 'all' && onAddForHousehold && (
            <button
              type="button"
              onClick={() => onAddForHousehold(activeHousehold)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              Add First Game for {activeHousehold}
            </button>
          )}
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24 sm:pb-8">
      {/* Household Header Banner if filtered */}
      {activeHousehold && activeHousehold !== 'all' && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              {activeHousehold.split('&').map(n => n.trim()[0]).join('&')}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {activeHousehold}’s Collection
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500">
                {games.length} board game{games.length === 1 ? '' : 's'} in this household
              </p>
            </div>
          </div>
          {onAddForHousehold && (
            <button
              type="button"
              onClick={() => onAddForHousehold(activeHousehold)}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Game to {activeHousehold}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            activeHousehold={activeHouseholdUser}
            onSelectGame={onSelectGame}
            onBorrow={onBorrow}
            onReturn={onReturn}
            onRequestBorrow={onRequestBorrow}
            onAcceptExchange={onAcceptExchange}
            onConfirmExchange={onConfirmExchange}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
};
