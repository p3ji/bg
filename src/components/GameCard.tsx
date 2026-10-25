'use client';

import React from 'react';
import { Game } from '@/types';
import { GameBoxCover } from './GameBoxCover';
import { 
  Users, 
  Clock, 
  Star, 
  Gauge, 
  ExternalLink, 
  Hand, 
  RotateCcw, 
  SendHorizontal, 
  Info,
  Calendar
} from 'lucide-react';

interface GameCardProps {
  game: Game;
  onSelectGame: (game: Game) => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelectGame,
  onBorrow,
  onReturn,
  onRequestBorrow,
}) => {
  const isAvailable = game.status === 'available';
  const hasPendingRequest = (game.borrowRequests || []).some((r) => r.status === 'pending');

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
    <div className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
      
      {/* Box Cover Top Section */}
      <div 
        className="relative aspect-4/3 sm:aspect-square w-full cursor-pointer overflow-hidden"
        onClick={() => onSelectGame(game)}
      >
        <GameBoxCover
          title={game.title}
          image={game.image}
          thumbnail={game.thumbnail}
          type={game.type}
          minPlayers={game.minPlayers}
          maxPlayers={game.maxPlayers}
          playtimeDisplay={game.playtimeDisplay}
          className="w-full h-full"
        />

        {/* Floating Status Badge */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-xs shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/95 text-white backdrop-blur-xs shadow-xs">
              <Clock className="w-3 h-3" />
              With {game.currentBorrower}
              {game.borrowDate && (
                <span className="opacity-90 font-normal text-[10px]">
                  ({formatBorrowDate(game.borrowDate)})
                </span>
              )}
            </span>
          )}

          {hasPendingRequest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
              Requested
            </span>
          )}
        </div>

        {/* BGG Rank & Rating Badge (if available) */}
        {(game.bggRating || game.bggRank) && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-xs text-white px-2 py-1 rounded-md text-[11px] font-bold border border-white/10 shadow-xs">
            {game.bggRating && (
              <span className="flex items-center gap-0.5 text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                {game.bggRating.toFixed(1)}
              </span>
            )}
            {game.bggRank && (
              <span className="text-zinc-300 font-mono text-[10px]">
                #{game.bggRank}
              </span>
            )}
          </div>
        )}

      </div>

      {/* Card Content Details */}
      <div className="flex-1 p-3.5 flex flex-col justify-between gap-3">
        
        <div>
          {/* Owner & Type line */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]" title={game.owner}>
              {game.owner}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium shrink-0">
              {game.type}
            </span>
          </div>

          {/* Title */}
          <h4 
            onClick={() => onSelectGame(game)}
            className="text-sm font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            title={game.title}
          >
            {game.title}
          </h4>

          {/* Notes snippet if exists */}
          {game.notes && (
            <p className="text-[11px] text-zinc-500 italic line-clamp-1 mt-0.5">
              &quot;{game.notes}&quot;
            </p>
          )}

          {/* Key Specs Row */}
          <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
            
            <div className="flex items-center gap-1" title="Player count">
              <Users className="w-3 h-3 text-zinc-400 shrink-0" />
              <span>
                {game.minPlayers === game.maxPlayers ? `${game.minPlayers}p` : `${game.minPlayers}–${game.maxPlayers}p`}
              </span>
            </div>

            <div className="flex items-center gap-1" title="Playing time">
              <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="truncate">{game.playtimeDisplay}</span>
            </div>

            <div className="flex items-center gap-1" title="Complexity Weight (1.0 - 5.0)">
              <Gauge className="w-3 h-3 text-zinc-400 shrink-0" />
              <span>{game.weight ? `${game.weight} / 5` : '—'}</span>
            </div>

          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5">
          {isAvailable ? (
            <button
              type="button"
              onClick={() => onBorrow(game)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Hand className="w-3.5 h-3.5" />
              Borrow
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReturn(game)}
                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                title="Mark this game as returned"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return
              </button>

              <button
                type="button"
                onClick={() => onRequestBorrow(game)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                title="Ping current borrower to request this game"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                Request
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onSelectGame(game)}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="View Details & Loan History"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
