'use client';

import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  UserPlus, 
  Trash2, 
  Key, 
  RotateCcw, 
  Check, 
  ShieldCheck,
  AlertTriangle 
} from 'lucide-react';
import { getBggToken, saveBggToken } from '@/lib/storage';

interface SettingsModalProps {
  friends: string[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateFriends: (friends: string[]) => void;
  onResetLibrary: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  friends,
  isOpen,
  onClose,
  onUpdateFriends,
  onResetLibrary,
}) => {
  const [newFriend, setNewFriend] = useState('');
  const [bggToken, setBggToken] = useState(() => getBggToken());
  const [tokenSaved, setTokenSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFriend.trim();
    if (!trimmed || friends.includes(trimmed)) return;
    onUpdateFriends([...friends, trimmed]);
    setNewFriend('');
  };

  const handleRemoveFriend = (name: string) => {
    onUpdateFriends(friends.filter((f) => f !== name));
  };

  const handleSaveToken = () => {
    saveBggToken(bggToken);
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2000);
  };

  const handleExecuteReset = () => {
    onResetLibrary();
    setConfirmReset(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Library Settings
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Manage group friends roster and BGG credentials
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

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* Friend Roster */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-2">
              Friend Circle Roster
            </h4>
            <p className="text-xs text-zinc-500 mb-3">
              Friends listed here appear in the 1-click borrow and request dropdowns.
            </p>

            {/* List of current friends */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {friends.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(name)}
                    className="text-zinc-400 hover:text-rose-500 transition-colors"
                    title={`Remove ${name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add friend form */}
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="text"
                value={newFriend}
                onChange={(e) => setNewFriend(e.target.value)}
                placeholder="Add friend name..."
                className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                disabled={!newFriend.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>
          </div>

          {/* BGG API Token */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1">
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                BoardGameGeek API Token (Optional)
              </h4>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              If you have registered an app on BoardGameGeek (at boardgamegeek.com/applications), paste your Bearer token here for direct authenticated queries.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={bggToken}
                onChange={(e) => setBggToken(e.target.value)}
                placeholder="Bearer token..."
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveToken}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                {tokenSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                {tokenSaved ? 'Saved' : 'Save Token'}
              </button>
            </div>
          </div>

          {/* Reset Library */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
              Reset Library Database
            </h4>
            <p className="text-xs text-zinc-500 mb-3">
              Reset the catalog back to the original 126 inventory games extracted from the spreadsheet.
            </p>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Library to Initial Inventory
              </button>
            ) : (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Are you sure? This will restore original inventory records.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                  >
                    Yes, Reset Library
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
