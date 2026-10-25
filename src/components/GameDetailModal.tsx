'use client';

import React from 'react';
import { Game } from '@/types';
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
  UserCheck
} from 'lucide-react';

interface GameDetailModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onBorrow: (game: Game) => void;
  onReturn: (game: Game) => void;
  onRequestBorrow: (game: Game) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  isOpen,
  onClose,
  onBorrow,
  onReturn,
  onRequestBorrow,
}) => {
  if (!isOpen || !game) return null;

  const isAvailable = game.status === 'available';
  const pendingRequests = (game.borrowRequests || []).filter((r) => r.status === 'pending');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {game.type}
              </span>
              <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                Owned by <strong className="text-zinc-800 dark:text-zinc-200">{game.owner}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {game.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {game.bggId && (
              <a
                href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors"
              >
                <span>BGG</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Top Section: Box Cover & Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            
            {/* Box Cover */}
            <div className="sm:col-span-5 aspect-square relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
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
            </div>

            {/* Game Specs & Live Loan Status */}
            <div className="sm:col-span-7 flex flex-col justify-between gap-4">
              
              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Users className="w-3 h-3" />
                    Players
                  </span>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {game.minPlayers === game.maxPlayers ? `${game.minPlayers} players` : `${game.minPlayers}–${game.maxPlayers} players`}
                  </p>
                </div>

                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Clock className="w-3 h-3" />
                    Playtime
                  </span>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {game.playtimeDisplay}
                  </p>
                </div>

                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    BGG Score
                  </span>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {game.bggRating ? `${game.bggRating.toFixed(1)} / 10` : '—'}
                    {game.bggRank && <span className="text-xs font-normal text-zinc-400 ml-1">Rank #{game.bggRank}</span>}
                  </p>
                </div>

                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Gauge className="w-3 h-3" />
                    Weight / Complexity
                  </span>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {game.weight ? `${game.weight} / 5.0` : '—'}
                  </p>
                </div>

              </div>

              {/* Current Loan Card */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Current Status
                  </span>
                  {isAvailable ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      Available to borrow
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                      With {game.currentBorrower}
                    </span>
                  )}
                </div>

                {!isAvailable && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5 pt-1">
                    <p>Borrowed on: <strong>{formatDate(game.borrowDate)}</strong> ({calculateDuration(game.borrowDate || '')})</p>
                    {game.expectedReturnDate && (
                      <p>Expected back: <strong>{formatDate(game.expectedReturnDate)}</strong></p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBorrow(game);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Hand className="w-3.5 h-3.5" />
                      Borrow This Game
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onReturn(game);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Mark as Returned
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestBorrow(game);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <SendHorizontal className="w-3.5 h-3.5" />
                        Request Borrow
                      </button>
                    </>
                  )}
                </div>

              </div>

            </div>

          </div>

          {/* Notes & Description */}
          {game.notes && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-0.5">Owner Notes:</span>
              &ldquo;{game.notes}&rdquo;
            </div>
          )}

          {/* Pending Requests on this game */}
          {pendingRequests.length > 0 && (
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5">
              <span className="font-bold block">Pending Borrow Requests:</span>
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex justify-between items-center py-1 border-t border-indigo-200/60 dark:border-indigo-800/40">
                  <div>
                    <strong>{req.requesterName}</strong> requested this on {formatDate(req.requestedAt)}
                    {req.note && <p className="italic text-indigo-700 dark:text-indigo-300 text-[11px]">&quot;{req.note}&quot;</p>}
                  </div>
                </div>
              ))}
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
                        <td className="py-2.5 px-3 font-mono text-zinc-500">
                          {calculateDuration(record.borrowDate, record.returnDate)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500 italic">
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

      </div>
    </div>
  );
};
