'use client';

import React, { useState } from 'react';
import { BorrowRequest, Game } from '@/types';
import { 
  X, 
  Bell, 
  MessageCircle, 
  Smartphone, 
  Copy, 
  Check, 
  CheckCircle2, 
  Trash2,
  Clock,
  ArrowRight
} from 'lucide-react';

interface NotificationsModalProps {
  requests: BorrowRequest[];
  games: Game[];
  isOpen: boolean;
  onClose: () => void;
  onFulfillRequest: (requestId: string) => void;
  onDismissRequest: (requestId: string) => void;
  onSelectGame: (game: Game) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  requests,
  games,
  isOpen,
  onClose,
  onFulfillRequest,
  onDismissRequest,
  onSelectGame,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const handleCopyNudge = (req: BorrowRequest) => {
    const text = `Hey ${req.holderName}! ${req.requesterName} requested to borrow "${req.gameTitle}" from our game library. Let them know when you're done with it! 🎲`;
    navigator.clipboard.writeText(text);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (req: BorrowRequest) => {
    const text = `Hey ${req.holderName}! ${req.requesterName} requested to borrow "${req.gameTitle}" from our game library. Let them know when you're done with it! 🎲`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSMS = (req: BorrowRequest) => {
    const text = `Hey ${req.holderName}! ${req.requesterName} requested to borrow "${req.gameTitle}" from our game library. Let them know when you're done with it! 🎲`;
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  };

  const formatTimeAgo = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 3600));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Borrow Requests & Activity
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {pendingRequests.length} pending request{pendingRequests.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Requests List */}
        <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">No pending borrow requests</p>
              <p className="mt-1">All borrowed games are in good hands with no waitlist.</p>
            </div>
          ) : (
            pendingRequests.map((req) => {
              const matchedGame = games.find((g) => g.id === req.gameId);
              return (
                <div
                  key={req.id}
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 
                        onClick={() => {
                          if (matchedGame) {
                            onClose();
                            onSelectGame(matchedGame);
                          }
                        }}
                        className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 cursor-pointer"
                      >
                        {req.gameTitle}
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <strong className="text-zinc-900 dark:text-zinc-200">{req.requesterName}</strong>
                        <span>wants to borrow from</span>
                        <strong className="text-zinc-900 dark:text-zinc-200">{req.holderName}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(req.requestedAt)}
                    </span>
                  </div>

                  {req.note && (
                    <p className="text-[11px] text-zinc-500 italic bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                      &ldquo;{req.note}&rdquo;
                    </p>
                  )}

                  {/* Actions toolbar */}
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(req)}
                        className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded"
                        title={`WhatsApp ${req.holderName}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSMS(req)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded"
                        title={`iMessage / SMS ${req.holderName}`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyNudge(req)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                        title="Copy nudge message"
                      >
                        {copiedId === req.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDismissRequest(req.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded"
                        title="Dismiss request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onFulfillRequest(req.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 text-white dark:text-zinc-900 rounded text-[11px] font-semibold transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Handed Off
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
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
