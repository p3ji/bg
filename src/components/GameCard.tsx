'use client';

import React from 'react';
import { Game, BorrowRequest } from '@/types';
import { normalizeName, isSameHousehold } from '@/lib/normalize';
import { GameBoxCover } from './GameBoxCover';
import { 
  Users, 
  Clock, 
  Star, 
  Gauge, 
  Hand, 
  RotateCcw, 
  SendHorizontal, 
  Info,
  Sparkles,
  ArrowRightLeft,
  Check,
  PackageCheck
} from 'lucide-react';

interface GameCardProps {
  game: Game;
  requests?: BorrowRequest[];
  activeHousehold?: string | null;
  onSelectGame: (game: Game) => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow?: (game: Game) => void;
  onAcceptExchange?: (requestId: string) => void;
  onConfirmExchange?: (requestId: string) => void;
  onEdit?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  requests,
  activeHousehold,
  onSelectGame,
  onBorrow,
  onReturn,
  onRequestBorrow,
  onAcceptExchange,
  onConfirmExchange,
  onEdit,
}) => {
  const isAvailable = game.status === 'available';

  // Find any active exchange (pending holder acceptance or accepted awaiting confirmation)
  const activeExchange =
    (requests || []).find(
      (r) => r.gameId === game.id && (r.status === 'pending' || r.status === 'accepted')
    ) ||
    (game.borrowRequests || []).find(
      (r) => r.status === 'pending' || r.status === 'accepted'
    );

  const formatBorrowDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const isSelfTest = Boolean(activeExchange && isSameHousehold(activeExchange.holderName, activeExchange.requesterName));
  const isUserHolder = Boolean(activeExchange && (isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, activeExchange.holderName))));
  const isUserRequester = Boolean(activeExchange && (isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, activeExchange.requesterName))));

  return (
    <div className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
      
      {/* Box Cover Top Section */}
      <div 
        className="relative aspect-square w-full cursor-pointer overflow-hidden"
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
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-20 flex flex-col gap-1 items-start">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-600/95 text-white backdrop-blur-xs shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="truncate max-w-[110px] sm:max-w-none">
                With {game.owner}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/95 text-white backdrop-blur-xs shadow-xs">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="truncate max-w-[110px] sm:max-w-none">
                With {game.currentBorrower}
              </span>
            </span>
          )}

          {activeExchange && (
            activeExchange.status === 'pending' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                <ArrowRightLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="truncate max-w-[90px] sm:max-w-none">Req: {activeExchange.requesterName}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-600 text-white shadow-xs animate-pulse">
                <PackageCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Ready</span>
              </span>
            )
          )}
        </div>

        {/* BGG Rank & Rating Badge (if available) */}
        {(game.bggRating || game.bggRank) && (
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 flex items-center gap-1 sm:gap-1.5 bg-black/75 backdrop-blur-xs text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold border border-white/10 shadow-xs">
            {game.bggRating && (
              <span className="flex items-center gap-0.5 text-amber-400">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400" />
                {game.bggRating.toFixed(1)}
              </span>
            )}
            {game.bggRank && (
              <span className="text-zinc-300 font-mono text-[9px] sm:text-[10px] hidden xs:inline">
                #{game.bggRank}
              </span>
            )}
          </div>
        )}

      </div>

      {/* Card Content Details */}
      <div className="flex-1 p-2.5 sm:p-3.5 flex flex-col justify-between gap-2 sm:gap-3">
        
        <div>
          {/* Type tag (no redundant owner line on home page) */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] sm:text-[10px] font-medium">
              {game.type}
            </span>
          </div>

          {/* Title */}
          <h4 
            onClick={() => onSelectGame(game)}
            className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            title={game.title}
          >
            {game.title}
          </h4>

          {/* Notes snippet if exists (hidden on small mobile to keep card compact) */}
          {game.notes && (
            <p className="text-[10px] sm:text-[11px] text-zinc-500 italic line-clamp-1 mt-0.5 hidden sm:block">
              &quot;{game.notes}&quot;
            </p>
          )}

          {/* Key Specs Row */}
          <div className="grid grid-cols-3 gap-1 mt-2 pt-1.5 sm:pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
            
            <div className="flex items-center gap-1" title="Player count">
              <Users className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="truncate">
                {game.minPlayers === game.maxPlayers ? `${game.minPlayers}p` : `${game.minPlayers}–${game.maxPlayers}p`}
              </span>
            </div>

            <div className="flex items-center gap-1" title="Playing time">
              <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="truncate">{game.playtimeDisplay}</span>
            </div>

            <div className="flex items-center gap-1" title="Complexity Weight (1.0 - 5.0)">
              <Gauge className="w-3 h-3 text-zinc-400 shrink-0" />
              <span>{game.weight ? `${game.weight}` : '—'}</span>
            </div>

          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1 sm:gap-1.5">
          {activeExchange ? (
            /* Active Exchange Actions */
            activeExchange.status === 'pending' ? (
              <button
                type="button"
                onClick={() => {
                  if (isUserHolder && onAcceptExchange) {
                    onAcceptExchange(activeExchange.id);
                  } else {
                    onSelectGame(game);
                  }
                }}
                disabled={!isUserHolder}
                className={`flex-1 min-h-[34px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                  isUserHolder
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                }`}
                title={isUserHolder ? "Holder can accept and execute exchange" : `Only ${activeExchange.holderName} can accept`}
              >
                <ArrowRightLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{isUserHolder ? 'Accept' : `Wait (${activeExchange.holderName})`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isUserRequester && onConfirmExchange) {
                    onConfirmExchange(activeExchange.id);
                  } else {
                    onSelectGame(game);
                  }
                }}
                disabled={!isUserRequester}
                className={`flex-1 min-h-[34px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                  isUserRequester
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                }`}
                title={isUserRequester ? "Borrower confirms receipt to complete exchange" : `Only ${activeExchange.requesterName} can confirm receipt`}
              >
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{isUserRequester ? 'Confirm' : `Wait (${activeExchange.requesterName})`}</span>
              </button>
            )
          ) : isAvailable ? (
            <button
              type="button"
              onClick={() => onBorrow(game)}
              className="flex-1 min-h-[34px] flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Borrow</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReturn(game)}
                className="flex-1 min-h-[34px] flex items-center justify-center gap-1 px-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                title="Mark this game as returned"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Return</span>
              </button>

              <button
                type="button"
                onClick={() => onBorrow(game)}
                className="min-h-[34px] flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                title="Send borrow request to current holder"
              >
                <SendHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Req</span>
              </button>
            </>
          )}

          {/* Edit / Link BGG button */}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(game);
              }}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Edit Game & Link BGG Cover"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectGame(game)}
            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
            title="View Details & Loan History"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
