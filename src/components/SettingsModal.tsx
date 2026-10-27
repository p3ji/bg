'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  UserPlus, 
  Key, 
  Check, 
  Sparkles,
  ExternalLink,
  Palette,
  Smartphone,
  Bell,
  RefreshCw
} from 'lucide-react';
import { getBggToken, saveBggToken, forceRefreshAllImages } from '@/lib/storage';
import { requestBadgeNotificationPermission, getNotificationPermissionStatus, updateHomeScreenAppBadge } from '@/lib/badgeManager';

interface SettingsModalProps {
  friends: string[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateFriends: (friends: string[]) => void;
  onResetLibrary?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  friends,
  isOpen,
  onClose,
  onUpdateFriends,
}) => {
  const [newFriend, setNewFriend] = useState('');
  const [bggToken, setBggToken] = useState(() => getBggToken());
  const [tokenSaved, setTokenSaved] = useState(false);
  const [imagesRefreshed, setImagesRefreshed] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [isSyncingBadge, setIsSyncingBadge] = useState(false);
  const [badgeSynced, setBadgeSynced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermissionStatus(getNotificationPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnableBadges = async () => {
    setIsSyncingBadge(true);
    const granted = await requestBadgeNotificationPermission();
    if (granted) {
      setPermissionStatus('granted');
      setBadgeSynced(true);
      setTimeout(() => setBadgeSynced(false), 3000);
    }
    setIsSyncingBadge(false);
  };

  const handleRefreshImages = () => {
    forceRefreshAllImages();
    setImagesRefreshed(true);
    setTimeout(() => setImagesRefreshed(false), 3000);
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 max-h-[92dvh] flex flex-col pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
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
          
          {/* Household Roster */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-2">
              Household Circle Roster
            </h4>
            <p className="text-xs text-zinc-500 mb-3">
              Households listed here appear in the 1-click borrow, return, and ownership dropdowns.
            </p>

            {/* List of current households */}
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

            {/* Add household form */}
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="text"
                value={newFriend}
                onChange={(e) => setNewFriend(e.target.value)}
                placeholder="Add household name (e.g. Maya & Sam)..."
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
                value={bggToken || ''}
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

          {/* Sync Official Covers */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1">
              Sync Official BGG Covers
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Refresh all game box art and BoardGameGeek links to the latest verified high-resolution database images.
            </p>
            <button
              type="button"
              onClick={handleRefreshImages}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900 rounded-lg transition-colors"
            >
              {imagesRefreshed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
              {imagesRefreshed ? 'All Covers Synced!' : 'Refresh & Sync All Covers'}
            </button>
          </div>

          {/* Phone Home Screen App Badges */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Phone Home Screen App Badging
              </h4>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Displays the red notification counter on your phone&apos;s app icon whenever an exchange request needs your action.
            </p>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                    1
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Icon Counter Status:
                    </span>
                    {permissionStatus === 'granted' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                        Enabled & Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Permission Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {permissionStatus === 'granted'
                      ? 'Badges will appear natively on your iPhone & Android home screens.'
                      : 'iOS & Android require notification permissions to badge the app icon.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEnableBadges}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs"
              >
                {isSyncingBadge ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : badgeSynced ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                <span>
                  {badgeSynced
                    ? 'Badge Synced!'
                    : isSyncingBadge
                    ? 'Syncing...'
                    : permissionStatus === 'granted'
                    ? 'Sync Badge Now'
                    : 'Enable App Badges'}
                </span>
              </button>
            </div>
          </div>

          {/* Cloud Database Sync Status */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Cloud Database Sync
              </h4>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3" />
                Live Firestore
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Connected to <strong className="font-mono text-zinc-800 dark:text-zinc-200">gameshare-d5fe0</strong>. Additions, borrow handshakes, and library changes sync live across all households.
            </p>
          </div>

          {/* Visual Portfolio Note */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Palette className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Check out Peji&apos;s visual portfolio
                  </p>
                  <a
                    href="https://portfolio.peji.ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    portfolio.peji.ca
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <a
                href="https://portfolio.peji.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-colors shrink-0 shadow-xs"
              >
                Visit
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            Check out Peji&apos;s visual portfolio &bull;{' '}
            <a
              href="https://portfolio.peji.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-0.5"
            >
              portfolio.peji.ca
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
