'use client';

import React from 'react';
import { Game, BorrowRequest } from '@/types';
import { isSameHousehold } from '@/lib/normalize';
import { GameBoxCover } from './GameBoxCover';
import { 
  Clock, 
  Star, 
  Hand, 
  RotateCcw, 
  SendHorizontal, 
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

  const isSelfTest = Boolean(activeExchange && isSameHousehold(activeExchange.holderName, activeExchange.requesterName));
  const isUserHolder = Boolean(activeExchange && (isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, activeExchange.holderName))));
  const isUserRequester = Boolean(activeExchange && (isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, activeExchange.requesterName))));

  const playerLabel =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}p`
      : `${game.minPlayers}–${game.maxPlayers}p`;

  return (
    <div
      onClick={() => onSelectGame(game)}
      className="group relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 cursor-pointer select-none"
    >
      {/* 100% Full-Bleed Box Cover */}
      <GameBoxCover
        title={game.title}
        image={game.image}
        thumbnail={game.thumbnail}
        type={game.type}
        minPlayers={game.minPlayers}
        maxPlayers={game.maxPlayers}
        playtimeDisplay={game.playtimeDisplay}
        fullBleedCard
        className="w-full h-full"
      />

      {/* Deep bottom scrim for crisp text & button contrast over any box art */}
      <div className="absolute inset-x-0 bottom-0 h-32 sm:h-36 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none z-10" />

      {/* Top Row: Floating Status Badge (Left) + BGG Rating & Edit (Right) */}
      <div className="absolute top-2 inset-x-2 sm:top-2.5 sm:inset-x-2.5 z-20 flex items-start justify-between gap-1.5 pointer-events-none">
        {/* Left: Owner / Holder + Exchange state */}
        <div className="flex flex-col gap-1 items-start min-w-0">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-600/95 text-white backdrop-blur-xs shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate max-w-[105px] sm:max-w-[140px]">
                With {game.owner}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/95 text-white backdrop-blur-xs shadow-sm">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
              <span className="truncate max-w-[105px] sm:max-w-[140px]">
                With {game.currentBorrower}
              </span>
            </span>
          )}

          {activeExchange && (
            activeExchange.status === 'pending' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-indigo-600/95 text-white shadow-sm">
                <ArrowRightLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                <span className="truncate max-w-[95px] sm:max-w-none">Req: {activeExchange.requesterName}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-600/95 text-white shadow-sm animate-pulse">
                <PackageCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                <span>Ready</span>
              </span>
            )
          )}
        </div>

        {/* Right: BGG Rating & Quick Edit */}
        <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
          {(game.bggRating || game.bggRank) && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-black/75 backdrop-blur-xs text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold border border-white/10 shadow-sm">
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

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(game);
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-black/60 hover:bg-indigo-600 text-zinc-200 hover:text-white rounded-md border border-white/10 backdrop-blur-xs opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              title="Edit Game & Link BGG Cover"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Overlay: Title + Specs (Left) & Primary Action (Right) */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-3 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            className="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow-xs group-hover:text-emerald-300 transition-colors"
            title={game.title}
          >
            {game.title}
          </h4>
          <p className="text-[10px] sm:text-[11px] text-zinc-300 font-medium truncate mt-0.5">
            {playerLabel} • {game.playtimeDisplay}
            {game.type ? ` • ${game.type}` : ''}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {activeExchange ? (
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
                className={`min-h-[30px] sm:min-h-[32px] flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold shadow-md transition-all ${
                  isUserHolder
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-900/80 text-zinc-400 border border-white/15 cursor-not-allowed'
                }`}
                title={isUserHolder ? 'Holder can accept and execute exchange' : `Only ${activeExchange.holderName} can accept`}
              >
                <ArrowRightLeft className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[75px] sm:max-w-[95px]">
                  {isUserHolder ? 'Accept' : `Wait`}
                </span>
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
                className={`min-h-[30px] sm:min-h-[32px] flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold shadow-md transition-all ${
                  isUserRequester
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                    : 'bg-zinc-900/80 text-zinc-400 border border-white/15 cursor-not-allowed'
                }`}
                title={isUserRequester ? 'Borrower confirms receipt to complete exchange' : `Only ${activeExchange.requesterName} can confirm receipt`}
              >
                <Check className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[75px] sm:max-w-[95px]">
                  {isUserRequester ? 'Confirm' : `Wait`}
                </span>
              </button>
            )
          ) : isAvailable ? (
            <button
              type="button"
              onClick={() => onBorrow(game)}
              className="min-h-[30px] sm:min-h-[32px] flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] sm:text-xs font-bold shadow-md transition-colors active:scale-95"
            >
              <Hand className="w-3 h-3 shrink-0" />
              <span>Borrow</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReturn(game)}
                className="min-h-[30px] sm:min-h-[32px] flex items-center justify-center gap-1 px-2 py-1 bg-zinc-800/95 hover:bg-zinc-700 text-white border border-white/15 rounded-lg text-[11px] sm:text-xs font-bold shadow-md transition-colors active:scale-95"
                title="Mark this game as returned"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span className="hidden xs:inline">Return</span>
              </button>

              <button
                type="button"
                onClick={() => onBorrow(game)}
                className="min-h-[30px] sm:min-h-[32px] flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600/95 hover:bg-indigo-500 text-white rounded-lg text-[11px] sm:text-xs font-bold shadow-md transition-colors active:scale-95"
                title="Send borrow request to current holder"
              >
                <SendHorizontal className="w-3 h-3 shrink-0" />
                <span>Req</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
