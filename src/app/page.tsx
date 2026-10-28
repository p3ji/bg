'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Game, BorrowRequest, ViewMode, FilterState, SheetRowGame } from '@/types';
import { 
  getInitialGames, 
  saveGames, 
  getInitialRequests, 
  saveRequests, 
  getInitialFriends, 
  saveFriends,
  getActiveHousehold,
  saveActiveHousehold
} from '@/lib/storage';
import { 
  subscribeToCloudGames, 
  subscribeToCloudRequests, 
  subscribeToCloudHouseholds,
  saveGameToCloud,
  saveGamesBatchToCloud,
  commitLendingAction,
  saveHouseholdsToCloud,
  seedCloudDatabaseIfNeeded
} from '@/lib/firebase';
import { registerServiceWorker, updateHomeScreenAppBadge, sendLocalSystemNotification } from '@/lib/badgeManager';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { BookshelfView } from '@/components/BookshelfView';
import { TableView } from '@/components/TableView';
import { GameDetailModal } from '@/components/GameDetailModal';
import { BorrowModal } from '@/components/BorrowModal';
import { ReturnModal } from '@/components/ReturnModal';
import { NotificationsModal } from '@/components/NotificationsModal';
import { BggSyncModal } from '@/components/BggSyncModal';
import { SettingsModal } from '@/components/SettingsModal';
import { EditGameModal } from '@/components/EditGameModal';
import { IdentityModal } from '@/components/IdentityModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { HomeNotificationBanner } from '@/components/HomeNotificationBanner';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { InstallFirstGate } from '@/components/InstallFirstGate';
import { shouldOfferInstallFirst } from '@/lib/pwa';
import { normalizeName, getCanonicalName, isSameHousehold } from '@/lib/normalize';
import { currentHolder, type LendingAction } from '@/lib/lending';
import { queueSheetJob, flushSheetJobs, sheetSyncStatus } from '@/lib/sheetsSync';
import { matchesGameSearch, matchesTitleEntity } from '@/lib/search';

const initialFilters: FilterState = {
  search: '',
  exactPlayers: null,
  maxPlaytime: null,
  availability: 'all',
  owner: 'all',
  type: 'all',
  sortBy: 'rank',
  sortOrder: 'asc',
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('bookshelf');
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Modals state
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [borrowingGame, setBorrowingGame] = useState<Game | null>(null);
  const [pendingBorrowGame, setPendingBorrowGame] = useState<Game | null>(null);
  const [returningGame, setReturningGame] = useState<Game | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBggSyncOpen, setIsBggSyncOpen] = useState(false);
  const [bggModalInitialTab, setBggModalInitialTab] = useState<'library' | 'search' | 'sync'>('library');
  const [selectedHouseholdForAdd, setSelectedHouseholdForAdd] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // 1-Tap Household Identity
  const [activeHousehold, setActiveHousehold] = useState<string | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isFirstIdentityPrompt, setIsFirstIdentityPrompt] = useState(false);
  const [forceShowInstallGuide, setForceShowInstallGuide] = useState(false);
  const [showInstallGate, setShowInstallGate] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    if (shouldOfferInstallFirst()) {
      setShowInstallGate(true);
    }

    const initialGames = getInitialGames();
    const initialRequests = getInitialRequests();
    const initialFriends = getInitialFriends();

    setGames(initialGames);
    setRequests(initialRequests);
    setFriends(initialFriends);

    const savedIdentity = getActiveHousehold();
    setActiveHousehold(savedIdentity);
    if (!savedIdentity) {
      setIsFirstIdentityPrompt(true);
      setIsIdentityModalOpen(true);
    }
    setMounted(true);
    registerServiceWorker();

    // Auto-seed Firestore on first connect if cloud database is empty
    seedCloudDatabaseIfNeeded(initialGames, initialFriends).catch(() => {});

    // Real-time Cloud Firestore Subscriptions across all friend devices
    const unsubCloudGames = subscribeToCloudGames((cloudGames) => {
      if (cloudGames && cloudGames.length > 0) {
        setGames(cloudGames);
        saveGames(cloudGames, { emitEvent: false });
      }
    });

    const unsubCloudRequests = subscribeToCloudRequests((cloudRequests) => {
      setRequests(cloudRequests);
      saveRequests(cloudRequests, { emitEvent: false });
    });

    const unsubCloudHouseholds = subscribeToCloudHouseholds((cloudFriends) => {
      if (cloudFriends && cloudFriends.length > 0) {
        setFriends(cloudFriends);
        saveFriends(cloudFriends);
      }
    });

    const handleGamesUpdate = () => setGames(getInitialGames());
    const handleRequestsUpdate = () => setRequests(getInitialRequests());
    const handleFriendsUpdate = () => setFriends(getInitialFriends());
    const handleIdentityUpdate = () => setActiveHousehold(getActiveHousehold());

    window.addEventListener('bg_games_updated', handleGamesUpdate);
    window.addEventListener('bg_requests_updated', handleRequestsUpdate);
    window.addEventListener('bg_friends_updated', handleFriendsUpdate);
    window.addEventListener('bg_identity_updated', handleIdentityUpdate);

    return () => {
      unsubCloudGames();
      unsubCloudRequests();
      unsubCloudHouseholds();
      window.removeEventListener('bg_games_updated', handleGamesUpdate);
      window.removeEventListener('bg_requests_updated', handleRequestsUpdate);
      window.removeEventListener('bg_friends_updated', handleFriendsUpdate);
      window.removeEventListener('bg_identity_updated', handleIdentityUpdate);
    };
  }, []);

  // Profile-specific actionable requests:
  // - Step 1: Active profile is holder of a pending request (action needed: Accept & Hand Off)
  // - Step 2: Active profile is requester of an accepted request (action needed: Confirm Receipt)
  // - Self-borrow test mode counts for both steps
  // If no profile is active, count is 0
  const myActionableRequests = useMemo(() => {
    if (!activeHousehold) return [];
    return requests.filter((r) => {
      const isSelfTest = isSameHousehold(r.holderName, r.requesterName, friends);
      if (r.status === 'pending') {
        return isSelfTest || isSameHousehold(r.holderName, activeHousehold, friends);
      }
      if (r.status === 'accepted') {
        return isSelfTest || isSameHousehold(r.requesterName, activeHousehold, friends);
      }
      return false;
    });
  }, [requests, activeHousehold, friends]);

  const myWaitingRequestsCount = useMemo(() => {
    if (!activeHousehold) return 0;
    return requests.filter((r) => {
      const isPendingRequester =
        r.status === 'pending' &&
        isSameHousehold(r.requesterName, activeHousehold, friends) &&
        !isSameHousehold(r.holderName, activeHousehold, friends);
      const isAcceptedHolder =
        r.status === 'accepted' &&
        isSameHousehold(r.holderName, activeHousehold, friends) &&
        !isSameHousehold(r.requesterName, activeHousehold, friends);
      return isPendingRequester || isAcceptedHolder;
    }).length;
  }, [requests, activeHousehold, friends]);

  // Badge counter strictly reflects actionable requests requiring YOUR attention (Scenario A)
  // Scenario B (outgoing requests waiting on friends) is excluded from badge numbers
  const pendingRequestsCount = myActionableRequests.length;
  const notifiedReqsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    updateHomeScreenAppBadge(pendingRequestsCount);
    if (pendingRequestsCount > 0) {
      const unnotified = myActionableRequests.filter((r) => !notifiedReqsRef.current.has(r.id));
      if (unnotified.length > 0) {
        unnotified.forEach((r) => notifiedReqsRef.current.add(r.id));
        const latest = unnotified[0];
        sendLocalSystemNotification(
          `🎲 Borrow Request from ${latest.requesterName}`,
          `Action needed: ${latest.requesterName} requested "${latest.gameTitle}". Tap to view & accept.`
        );
      }
    }
  }, [pendingRequestsCount, myActionableRequests]);

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    const dir = filters.sortOrder === 'desc' ? -1 : 1;
    return games
      .filter((game) => {
        // Search query with typo and spelling tolerance
        if (filters.search && !matchesGameSearch(filters.search, game)) {
          return false;
        }

        // Exact Player Count
        if (filters.exactPlayers !== null) {
          const p = filters.exactPlayers;
          if (p === 6) {
            // 6 or more
            if (game.maxPlayers < 6) return false;
          } else {
            if (game.minPlayers > p || game.maxPlayers < p) return false;
          }
        }

        // Max Playtime
        if (filters.maxPlaytime !== null) {
          const effectiveMinPlaytime = game.minPlaytime > 0 ? game.minPlaytime : (game.maxPlaytime || 0);
          if (effectiveMinPlaytime > filters.maxPlaytime) return false;
        }

        // Availability
        if (filters.availability === 'available' && game.status !== 'available') return false;
        if (filters.availability === 'borrowed' && game.status !== 'borrowed') return false;

        // Owner Household
        if (filters.owner !== 'all' && !isSameHousehold(game.owner, filters.owner, friends)) return false;

        // Type / Category
        if (filters.type !== 'all' && !(game.type || '').toLowerCase().includes(filters.type.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'rank': {
            const hasRankA = a.bggRank != null && a.bggRank > 0;
            const hasRankB = b.bggRank != null && b.bggRank > 0;
            if (!hasRankA && !hasRankB) return a.title.localeCompare(b.title);
            if (!hasRankA) return 1;
            if (!hasRankB) return -1;
            return dir * ((a.bggRank as number) - (b.bggRank as number));
          }
          case 'rating': {
            const hasRateA = a.bggRating != null && a.bggRating > 0;
            const hasRateB = b.bggRating != null && b.bggRating > 0;
            if (!hasRateA && !hasRateB) return a.title.localeCompare(b.title);
            if (!hasRateA) return 1;
            if (!hasRateB) return -1;
            return dir * ((a.bggRating as number) - (b.bggRating as number));
          }
          case 'playtime': {
            const diff = (a.minPlaytime || 0) - (b.minPlaytime || 0);
            return diff !== 0 ? dir * diff : a.title.localeCompare(b.title);
          }
          case 'weight': {
            const hasW_A = a.weight != null && a.weight > 0;
            const hasW_B = b.weight != null && b.weight > 0;
            if (!hasW_A && !hasW_B) return a.title.localeCompare(b.title);
            if (!hasW_A) return 1;
            if (!hasW_B) return -1;
            return dir * ((a.weight as number) - (b.weight as number));
          }
          case 'players': {
            const diff = (a.maxPlayers || 0) - (b.maxPlayers || 0);
            return diff !== 0 ? dir * diff : a.title.localeCompare(b.title);
          }
          case 'title':
          default:
            return dir * a.title.localeCompare(b.title);
        }
      });
  }, [games, filters, friends]);

  // Inventory stats
  const availableCount = useMemo(() => games.filter((g) => g.status === 'available').length, [games]);
  const borrowedCount = useMemo(() => games.filter((g) => g.status === 'borrowed').length, [games]);

  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [saveError, setSaveError] = useState('');
  const [sheetStatus, setSheetStatus] = useState({ count: 0, error: '' });
  const performSave = async (operation: () => Promise<void>): Promise<boolean> => {
    if (saveInFlight.current) return false;
    saveInFlight.current = true;
    setSaving(true);
    setSaveError('');
    try {
      if (!navigator.onLine) throw new Error("You are offline. Reconnect before saving.");
      await operation();
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save. Please try again.');
      return false;
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    const update = () => setSheetStatus(sheetSyncStatus());
    const retry = () => { void flushSheetJobs(); };
    window.addEventListener('bg_sheet_sync', update);
    window.addEventListener('online', retry);
    update();
    retry();
    return () => {
      window.removeEventListener('bg_sheet_sync', update);
      window.removeEventListener('online', retry);
    };
  }, []);

  const syncGameToSheets = (game: Game, previous = game) => {
    queueSheetJob({ id: game.id, gameId: game.id, previousOwner: previous.owner, previousTitle: previous.title });
    void flushSheetJobs();
  };

  const saveLending = (gameId: string, action: LendingAction) => performSave(async () => {
    const updated = await commitLendingAction(gameId, action, friends);
    // Firestore subscriptions deliver the authoritative game and requests to every device.
    setSelectedGame(previous => previous?.id === gameId ? updated : previous);
    if (['borrow', 'return', 'confirm'].includes(action.type)) syncGameToSheets(updated);
  });

  const handleBorrowConfirm = (gameId: string, borrower: string, returnDate?: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return Promise.resolve(false);
    return saveLending(gameId, { type: 'borrow', borrower, returnDate, expectedHolder: currentHolder(game) });
  };
  const handleReturnConfirm = (gameId: string, notes?: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return Promise.resolve(false);
    return saveLending(gameId, { type: 'return', notes, expectedHolder: currentHolder(game) });
  };
  const handleRequestExchange = (gameId: string, requester: string, returnDate?: string, notes?: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return Promise.resolve(false);
    return saveLending(gameId, { type: 'request', request: {
      id: `req-${crypto.randomUUID()}`, gameId, gameTitle: game.title,
      requesterName: getCanonicalName(requester, friends), holderName: currentHolder(game),
      requestedAt: new Date().toISOString(), status: 'pending', expectedReturnDate: returnDate, note: notes,
    } });
  };
  const requestAction = (requestId: string, type: 'accept' | 'confirm' | 'dismiss') => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return Promise.resolve(false);
    return saveLending(request.gameId, { type, requestId, actor: activeHousehold });
  };
  const handleAcceptExchange = (id: string) => requestAction(id, 'accept');
  const handleConfirmExchange = (id: string) => requestAction(id, 'confirm');
  const handleDismissRequest = (id: string) => requestAction(id, 'dismiss');

  const handleAddGame = (data: Omit<Game, 'id' | 'status' | 'history'>) => performSave(async () => {
    const existing = games.find(g => isSameHousehold(g.owner, data.owner, friends) && matchesTitleEntity(g.title, data.title));
    const game: Game = { ...data, id: existing?.id || `game-${crypto.randomUUID()}`,
      status: existing?.status || 'available', history: existing?.history || [],
      currentBorrower: existing?.currentBorrower || null, borrowRequests: existing?.borrowRequests || [] };
    await saveGameToCloud(game);
    syncGameToSheets(game, existing || game);
  });

  const handleBatchImportGames = (imported: Omit<Game, 'id' | 'status' | 'history'>[]) => performSave(async () => {
    const created: Game[] = [];
    for (const data of imported) {
      if ([...games, ...created].some(g => isSameHousehold(g.owner, data.owner, friends) && matchesTitleEntity(g.title, data.title))) continue;
      created.push({ ...data, id: `game-${crypto.randomUUID()}`, status: 'available', history: [], borrowRequests: [] });
    }
    if (!created.length) return;
    await saveGamesBatchToCloud(created);
    for (const game of created) queueSheetJob({ id: game.id, gameId: game.id, previousOwner: game.owner, previousTitle: game.title });
    void flushSheetJobs();
  });

  const handleUpdateFriends = (updatedFriends: string[]) => performSave(async () => {
    await saveHouseholdsToCloud(updatedFriends);
    for (const household of updatedFriends.filter(f => !friends.includes(f))) {
      queueSheetJob({ id: `household:${household}`, household });
    }
    void flushSheetJobs();
    if (activeHousehold && !updatedFriends.some(f => isSameHousehold(f, activeHousehold, updatedFriends))) {
      setActiveHousehold(null);
      saveActiveHousehold('');
    }
    if (filters.owner !== 'all' && !updatedFriends.some(f => isSameHousehold(f, filters.owner, updatedFriends))) {
      setFilters(previous => ({ ...previous, owner: 'all' }));
    }
  });

  const handleOpenAddForHousehold = (household: string) => {
    setSelectedHouseholdForAdd(household);
    setBggModalInitialTab('search');
    setIsBggSyncOpen(true);
  };

  const handleOpenGeneralAdd = () => {
    setSelectedHouseholdForAdd(
      filters.owner !== 'all' ? filters.owner : (activeHousehold || undefined)
    );
    setBggModalInitialTab('search');
    setIsBggSyncOpen(true);
  };

  const handleOpenMobileSearch = () => {
    setSelectedHouseholdForAdd(
      filters.owner !== 'all' ? filters.owner : (activeHousehold || undefined)
    );
    setBggModalInitialTab('library');
    setIsBggSyncOpen(true);
  };

  const handleSaveEditedGame = (updatedGame: Game) => performSave(async () => {
    await saveGameToCloud(updatedGame);
    syncGameToSheets(updatedGame, editingGame || updatedGame);
  });

  const handleSyncGamesFromSheets = (sheetGames: SheetRowGame[], rosterOverride?: string[]) => performSave(async () => {
    if (!sheetGames || sheetGames.length === 0) return;
    const activeFriends = rosterOverride && rosterOverride.length > 0 ? rosterOverride : friends;
    const prevGames = games;
    let changed = false;
    const matchedSheetIndices = new Set<number>();
    const changedGamesForCloud: Game[] = [];

    prevGames.forEach((game) => {
      // 1. Try exact normalized title match first within the same household
      let matchIndex = sheetGames.findIndex(
        (sg, idx) =>
          !matchedSheetIndices.has(idx) &&
          isSameHousehold(sg.household, game.owner, activeFriends) &&
          normalizeName(sg.title) === normalizeName(game.title)
      );

      // 2. Fallback to strict entity title match within the same household
      if (matchIndex === -1) {
        matchIndex = sheetGames.findIndex(
          (sg, idx) =>
            !matchedSheetIndices.has(idx) &&
            isSameHousehold(sg.household, game.owner, activeFriends) &&
            matchesTitleEntity(sg.title, game.title)
        );
      }

      if (matchIndex === -1) return game;
      matchedSheetIndices.add(matchIndex);
      const match = sheetGames[matchIndex];

      let gameChanged = false;
      const newTitle = match.title || game.title;
      const newMinP = match.minPlayers ?? game.minPlayers;
      const newMaxP = match.maxPlayers ?? game.maxPlayers;
      const newType = match.type || game.type;
      const newMinPlaytime = match.minPlaytime ?? match.playtime ?? game.minPlaytime;
      const newMaxPlaytime = match.maxPlaytime ?? Math.max(newMinPlaytime, game.maxPlaytime);
      const newPlaytimeDisplay =
        match.playtimeDisplay ||
        (newMinPlaytime === newMaxPlaytime ? `${newMinPlaytime}m` : `${newMinPlaytime}-${newMaxPlaytime}m`);
      const newNotes = match.notes !== undefined ? match.notes : (game.notes || '');

      if (
        newTitle !== game.title ||
        newMinP !== game.minPlayers ||
        newMaxP !== game.maxPlayers ||
        newType !== game.type ||
        newMinPlaytime !== game.minPlaytime ||
        newMaxPlaytime !== game.maxPlaytime ||
        newPlaytimeDisplay !== game.playtimeDisplay ||
        newNotes !== (game.notes || '')
      ) {
        gameChanged = true;
        changed = true;
      }

      if (gameChanged) {
        const nextGame: Game = {
          ...game,
          title: newTitle,
          minPlayers: newMinP,
          maxPlayers: newMaxP,
          type: newType,
          minPlaytime: newMinPlaytime,
          maxPlaytime: newMaxPlaytime,
          playtimeDisplay: newPlaytimeDisplay,
          notes: newNotes,
        };
        changedGamesForCloud.push(nextGame);
        return nextGame;
      }
      return game;
    });

    // Import any newly added rows from Google Sheets that aren't in prevGames yet

    sheetGames.forEach((sg, idx) => {
      if (!matchedSheetIndices.has(idx) && sg.title) {
        changed = true;
        const borrower = sg.borrowedBy ? getCanonicalName(sg.borrowedBy, activeFriends) : null;
        const minPlay = sg.minPlaytime ?? sg.playtime ?? 30;
        const maxPlay = sg.maxPlaytime ?? Math.max(minPlay, 60);
        const created: Game = {
          id: `sheet-${crypto.randomUUID()}`,
          title: sg.title,
          owner: getCanonicalName(sg.household, activeFriends),
          minPlayers: sg.minPlayers || 2,
          maxPlayers: sg.maxPlayers || 4,
          minPlaytime: minPlay,
          maxPlaytime: maxPlay,
          playtimeDisplay: sg.playtimeDisplay || (minPlay === maxPlay ? `${minPlay}m` : `${minPlay}-${maxPlay}m`),
          type: sg.type || 'Strategy',
          notes: sg.notes || '',
          status: borrower ? 'borrowed' : 'available',
          currentBorrower: borrower,
          borrowDate: borrower ? new Date().toISOString() : null,
          expectedReturnDate: null,
          history: [],
          borrowRequests: [],
        };

        changedGamesForCloud.push(created);
      }
    });

    if (changed) await saveGamesBatchToCloud(changedGamesForCloud);
  });

  const handleInitiateBorrow = (game: Game) => {
    if (!activeHousehold) {
      setPendingBorrowGame(game);
      setIsFirstIdentityPrompt(false);
      setIsIdentityModalOpen(true);
      return;
    }
    setBorrowingGame(game);
  };

  const handleSelectHousehold = (household: string) => {
    saveActiveHousehold(household);
    setActiveHousehold(household);
    setIsIdentityModalOpen(false);
    setIsFirstIdentityPrompt(false);
    if (pendingBorrowGame) {
      setBorrowingGame(pendingBorrowGame);
      setPendingBorrowGame(null);
    }
  };

  const handleTableSort = (sortBy: FilterState['sortBy']) => {
    setFilters((prev) => {
      if (prev.sortBy === sortBy) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      const defaultOrder: 'asc' | 'desc' =
        sortBy === 'rating' || sortBy === 'weight' || sortBy === 'players' ? 'desc' : 'asc';
      return { ...prev, sortBy, sortOrder: defaultOrder };
    });
  };

  // Derive live modal targets from `games` by ID so cloud/request updates reflect immediately
  const liveSelectedGame = useMemo(
    () => (selectedGame ? games.find((g) => g.id === selectedGame.id) || selectedGame : null),
    [games, selectedGame]
  );
  const liveBorrowingGame = useMemo(
    () => (borrowingGame ? games.find((g) => g.id === borrowingGame.id) || borrowingGame : null),
    [games, borrowingGame]
  );
  const liveReturningGame = useMemo(
    () => (returningGame ? games.find((g) => g.id === returningGame.id) || returningGame : null),
    [games, returningGame]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile First-Time Install Gate (Recommended on phones, same as PA Tracker)
  if (showInstallGate) {
    return (
      <InstallFirstGate
        onContinue={() => setShowInstallGate(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-900 selection:text-white">
      
      {saving && <div role="status" aria-live="polite" className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center">
        <p className="rounded-xl bg-white text-zinc-900 p-5 shadow-xl">Saving to the shared library…</p>
      </div>}
      {saveError && <div role="alert" className="fixed top-3 left-3 right-3 z-[110] rounded-xl bg-red-50 text-red-950 border border-red-300 p-4 shadow-lg">
        <p>Could not save: {saveError} Please try the action again.</p>
        <button type="button" className="mt-2 underline font-semibold" onClick={() => setSaveError('')}>Dismiss</button>
      </div>}
      {sheetStatus.count > 0 && <div role="status" className="fixed bottom-20 left-3 right-3 z-[90] rounded-xl bg-amber-50 text-amber-950 border border-amber-300 p-3 shadow-lg">
        <p>Saved to the shared library. {sheetStatus.count} Google Sheets update(s) pending.{sheetStatus.error ? ` ${sheetStatus.error}` : ''}</p>
        <button type="button" className="underline font-semibold" onClick={() => { void flushSheetJobs(); }}>Retry Sheets sync</button>
      </div>}
      {/* Top Header */}
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalGames={games.length}
        availableCount={availableCount}
        borrowedCount={borrowedCount}
        pendingRequestsCount={pendingRequestsCount}
        actionableCount={pendingRequestsCount}
        waitingCount={myWaitingRequestsCount}
        activeHousehold={activeHousehold}
        onOpenIdentityModal={() => {
          setIsFirstIdentityPrompt(false);
          setIsIdentityModalOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAddModal={handleOpenGeneralAdd}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        filters={filters}
        friends={friends}
        onChange={setFilters}
        onReset={() => setFilters(initialFilters)}
        resultCount={filteredGames.length}
        onAddForHousehold={handleOpenAddForHousehold}
      />

      {/* Prominent Home Screen Notification & Handshake Banner */}
      <HomeNotificationBanner
        requests={requests}
        activeHousehold={activeHousehold}
        onAcceptExchange={handleAcceptExchange}
        onConfirmExchange={handleConfirmExchange}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {viewMode === 'bookshelf' ? (
          <BookshelfView
            games={filteredGames}
            requests={requests}
            activeHousehold={filters.owner}
            activeHouseholdUser={activeHousehold}
            onSelectGame={setSelectedGame}
            onBorrow={handleInitiateBorrow}
            onReturn={setReturningGame}
            onRequestBorrow={handleInitiateBorrow}
            onAcceptExchange={handleAcceptExchange}
            onConfirmExchange={handleConfirmExchange}
            onResetFilters={() => setFilters(initialFilters)}
            onAddForHousehold={handleOpenAddForHousehold}
            onEdit={setEditingGame}
          />
        ) : (
          <TableView
            games={filteredGames}
            requests={requests}
            activeHousehold={filters.owner}
            activeHouseholdUser={activeHousehold}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={handleTableSort}
            onSelectGame={setSelectedGame}
            onBorrow={handleInitiateBorrow}
            onReturn={setReturningGame}
            onRequestBorrow={handleInitiateBorrow}
            onAcceptExchange={handleAcceptExchange}
            onConfirmExchange={handleConfirmExchange}
            onResetFilters={() => setFilters(initialFilters)}
            onAddForHousehold={handleOpenAddForHousehold}
            onEdit={setEditingGame}
          />
        )}
      </main>

      {/* Modals */}
      <GameDetailModal
        game={liveSelectedGame}
        requests={requests}
        activeHousehold={activeHousehold}
        isOpen={Boolean(liveSelectedGame)}
        onClose={() => setSelectedGame(null)}
        onBorrow={handleInitiateBorrow}
        onReturn={setReturningGame}
        onRequestBorrow={handleInitiateBorrow}
        onAcceptExchange={handleAcceptExchange}
        onConfirmExchange={handleConfirmExchange}
        onEdit={setEditingGame}
      />

      <BorrowModal
        game={liveBorrowingGame}
        friends={friends}
        isOpen={Boolean(liveBorrowingGame)}
        activeHousehold={activeHousehold}
        onClose={() => setBorrowingGame(null)}
        onRequestExchange={handleRequestExchange}
        onDirectBorrow={handleBorrowConfirm}
      />

      <ReturnModal
        game={liveReturningGame}
        requests={requests}
        isOpen={Boolean(liveReturningGame)}
        onClose={() => setReturningGame(null)}
        onConfirm={handleReturnConfirm}
      />

      <NotificationsModal
        requests={requests}
        games={games}
        isOpen={isNotificationsOpen}
        activeHousehold={activeHousehold}
        onClose={() => setIsNotificationsOpen(false)}
        onAcceptExchange={handleAcceptExchange}
        onConfirmExchange={handleConfirmExchange}
        onDismissRequest={handleDismissRequest}
        onSelectGame={setSelectedGame}
      />

      <BggSyncModal
        isOpen={isBggSyncOpen}
        games={games}
        friends={friends}
        onClose={() => {
          setIsBggSyncOpen(false);
          setSelectedHouseholdForAdd(undefined);
        }}
        onAddGame={handleAddGame}
        onBatchImportGames={handleBatchImportGames}
        onSelectGame={setSelectedGame}
        onBorrow={handleInitiateBorrow}
        onReturn={setReturningGame}
        initialHousehold={selectedHouseholdForAdd}
        initialTab={bggModalInitialTab}
      />

      <SettingsModal
        friends={friends}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateFriends={handleUpdateFriends}
        onSyncGames={handleSyncGamesFromSheets}
        onTriggerInstallGuide={() => setForceShowInstallGuide(true)}
      />

      <EditGameModal
        game={editingGame}
        friends={friends}
        isOpen={Boolean(editingGame)}
        onClose={() => setEditingGame(null)}
        onSave={handleSaveEditedGame}
      />

      <IdentityModal
        isOpen={isIdentityModalOpen}
        friends={friends}
        onClose={() => {
          setIsIdentityModalOpen(false);
          setIsFirstIdentityPrompt(false);
          setPendingBorrowGame(null);
        }}
        activeHousehold={activeHousehold}
        onSelectHousehold={handleSelectHousehold}
        isInitialPrompt={isFirstIdentityPrompt}
      />

      {/* Floating PWA Install Prompt & Installation Guide */}
      <PwaInstallPrompt
        canShowBanner={mounted && !isIdentityModalOpen}
        forceShowInstructions={forceShowInstallGuide}
        onCloseInstructions={() => setForceShowInstallGuide(false)}
      />

      {/* Mobile Bottom Navigation Bar (thumb-friendly on phones) */}
      <MobileBottomNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pendingRequestsCount={pendingRequestsCount}
        activeHousehold={activeHousehold}
        onOpenSearchModal={handleOpenMobileSearch}
        onOpenAddModal={handleOpenGeneralAdd}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenIdentityModal={() => {
          setIsFirstIdentityPrompt(false);
          setIsIdentityModalOpen(true);
        }}
      />

    </div>
  );
}
