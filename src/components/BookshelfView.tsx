'use client';

import React from 'react';
import { Game } from '@/types';
import { GameCard } from './GameCard';
import { PackageOpen, Sparkles } from 'lucide-react';

interface BookshelfViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow: (game: Game) => void;
  onResetFilters: () => void;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  games,
  onSelectGame,
  onBorrow,
  onReturn,
  onRequestBorrow,
  onResetFilters,
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

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onSelectGame={onSelectGame}
            onBorrow={onBorrow}
            onReturn={onReturn}
            onRequestBorrow={onRequestBorrow}
          />
        ))}
      </div>
    </div>
  );
};
