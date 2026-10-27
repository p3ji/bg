'use client';

import React from 'react';
import { Game } from '@/types';
import { normalizeName } from '@/lib/normalize';
import { GameBoxCover } from './GameBoxCover';
import { 
  X, 
  Users, 
  Clock, 
  Star, 
  Gauge, 
  ExternalLink, 
  RotateCcw, 
  Hand, 
  SendHorizontal, 
  History,
  Calendar,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Edit3,
  ArrowRightLeft,
  Check,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

interface GameDetailModalProps {
  game: Game | null;
  activeHousehold?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow?: (game: Game) => void;
  onAcceptExchange?: (requestId: string) => void;
  onConfirmExchange?: (requestId: string) => void;
  onEdit?: (game: Game) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  activeHousehold,
  isOpen,
  onClose,
  onBorrow,
  onReturn,
  onRequestBorrow,
  onAcceptExchange,
  onConfirmExchange,
  onEdit,
}) => {
  if (!isOpen || !game) return null;

  const isAvailable = game.status === 'available';
  const activeExchange = (game.borrowRequests || []).find(
    (r) => r.status === 'pending' || r.status === 'accepted'
  );

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return isoStr;
    }
  };

  const calculateDuration = (startIso: string, endIso?: string) => {
    try {
      const start = new Date(startIso).getTime();
      const end = endIso ? new Date(endIso).getTime() : Date.now();
      const days = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
      return `${days} day${days === 1 ? '' : 's'}`;
    } catch {
      return '';
    }
  };

  const isSelfTest = Boolean(activeExchange && normalizeName(activeExchange.holderName) === normalizeName(activeExchange.requesterName));
  const isUserHolder = Boolean(activeExchange && (isSelfTest || (activeHousehold && normalizeName(activeHousehold) === normalizeName(activeExchange.holderName))));
  const isUserRequester = Boolean(activeExchange && (isSelfTest || (activeHousehold && normalizeName(activeHousehold) === normalizeName(activeExchange.requesterName))));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      
      <div 
        className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden pb-safe sm:pb-0 animate-in slide-in-from-bottom duration-200 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />
        
        {/* Header */}
        <div className="p-3.5 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {game.type}
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs font-medium text-zinc-500">
              Owner: <strong className="text-zinc-800 dark:text-zinc-200">{game.owner}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(game);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Edit game or link BGG box art cover"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit & Link Cover</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Top Hero Layout: Box Art + Title & Key Metadata */}
          <div className="flex flex-col sm:flex-row gap-5">
            
            {/* Box Cover Thumbnail with BGG Link */}
            <div className="w-full sm:w-48 aspect-4/3 sm:aspect-square shrink-0 rounded-xl overflow-hidden shadow-md border border-zinc-200 dark:border-zinc-800 relative group">
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
              {game.bggId && (
                <a
                  href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-black/75 hover:bg-black text-white p-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  title="Open on BoardGameGeek"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Title & Specs */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                    {game.title}
                  </h3>
                  {game.year && (
                    <span className="text-xs font-mono text-zinc-400">
                      ({game.year})
                    </span>
                  )}
                </div>

                {/* Rating & Rank Pills */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {game.bggRating && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {game.bggRating.toFixed(1)} / 10
                    </span>
                  )}
                  {game.bggRank && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      BGG Rank #{game.bggRank}
                    </span>
                  )}
                  {game.weight && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      <Gauge className="w-3 h-3 text-zinc-400" />
                      Weight: {game.weight} / 5
                    </span>
                  )}
                </div>

                {/* Quick specs grid */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span>
                      Players: <strong>{game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}–${game.maxPlayers}`}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span>
                      Playtime: <strong>{game.playtimeDisplay}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Action Panel */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                
                {/* Active Exchange in progress */}
                {activeExchange ? (
                  <div className="p-3 rounded-xl border bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Exchange In Progress
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {activeExchange.status === 'pending' ? 'Step 1 of 2' : 'Step 2 of 2'}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                      <p>
                        From: <strong>{activeExchange.holderName}</strong> ➔ To: <strong>{activeExchange.requesterName}</strong>
                      </p>
                      {activeExchange.note && (
                        <p className="italic text-[11px] text-zinc-500">&ldquo;{activeExchange.note}&rdquo;</p>
                      )}
                    </div>

                    {/* Step guidance & action */}
                    {activeExchange.status === 'pending' ? (
                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                          Waiting for <strong>{activeExchange.holderName}</strong> to accept
                        </span>
                        {isUserHolder ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onAcceptExchange) {
                                onAcceptExchange(activeExchange.id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors active:scale-95 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Accept & Execute Exchange
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                            Only {activeExchange.holderName} can accept
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                          <strong>{activeExchange.holderName}</strong> accepted! Confirm receipt:
                        </span>
                        {isUserRequester ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onConfirmExchange) {
                                onConfirmExchange(activeExchange.id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors active:scale-95 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Confirm Received
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                            Only {activeExchange.requesterName} can confirm
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : isAvailable ? (
                  /* Available loan status */
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Available at {game.owner}&apos;s household
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBorrow(game);
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Hand className="w-3.5 h-3.5" />
                      Borrow This Game
                    </button>
                  </div>
                ) : (
                  /* Borrowed loan status */
                  <div className="space-y-2">
                    <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-300">
                      <p className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Currently held by: <strong className="text-zinc-900 dark:text-zinc-100">{game.currentBorrower}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5 text-zinc-500">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Borrowed on: {formatDate(game.borrowDate)} ({calculateDuration(game.borrowDate || '')})</span>
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onReturn(game);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Mark as Returned to Owner
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onBorrow(game);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <SendHorizontal className="w-3.5 h-3.5" />
                        Borrow from {game.currentBorrower}
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* Notes & Description */}
          {game.notes && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-0.5">Notes:</span>
              &ldquo;{game.notes}&rdquo;
            </div>
          )}

          {/* Loan History Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-zinc-500" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Loan History Log
              </h4>
              <span className="text-xs text-zinc-400 font-mono">
                ({game.history?.length || 0} past {game.history?.length === 1 ? 'borrow' : 'borrows'})
              </span>
            </div>

            {(!game.history || game.history.length === 0) ? (
              <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
                No past loan history recorded for this game yet.
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Borrower</th>
                      <th className="py-2.5 px-3">Borrowed On</th>
                      <th className="py-2.5 px-3">Returned On</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {game.history.map((record) => (
                      <tr key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {record.borrower}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                          {formatDate(record.borrowDate)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                          {formatDate(record.returnDate)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">
                          {calculateDuration(record.borrowDate, record.returnDate)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 italic">
                          {record.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-3 px-6 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
};
