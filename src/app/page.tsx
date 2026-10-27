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
  saveRequestToCloud,
  deleteRequestFromCloud,
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

  // Action Handlers
  const handleBorrowConfirm = (gameId: string, borrower: string, returnDate?: string) => {
    const canonicalBorrower = getCanonicalName(borrower, friends);
    const nowIso = new Date().toISOString();
    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        status: 'borrowed' as const,
        currentBorrower: canonicalBorrower,
        borrowDate: nowIso,
        expectedReturnDate: returnDate || null,
        borrowRequests: (g.borrowRequests || []).map((r) => {
          if (isSameHousehold(r.requesterName, canonicalBorrower, friends) && (r.status === 'pending' || r.status === 'accepted')) {
            return { ...r, status: 'fulfilled' as const, confirmedAt: nowIso };
          }
          if (r.status === 'pending') {
            return { ...r, holderName: canonicalBorrower };
          }
          return r;
        }),
      };
    });

    // Mark requests by this borrower as fulfilled, and update holderName on other pending requests
    const changedReqs: BorrowRequest[] = [];
    const updatedRequests = requests.map((r) => {
      if (r.gameId !== gameId) return r;
      if (
        isSameHousehold(r.requesterName, canonicalBorrower, friends) &&
        (r.status === 'pending' || r.status === 'accepted')
      ) {
        const next: BorrowRequest = { ...r, status: 'fulfilled', confirmedAt: nowIso };
        changedReqs.push(next);
        return next;
      }
      if (r.status === 'pending' && r.holderName !== canonicalBorrower) {
        const next: BorrowRequest = { ...r, holderName: canonicalBorrower };
        changedReqs.push(next);
        return next;
      }
      return r;
    });

    setGames(updatedGames);
    saveGames(updatedGames);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    const updatedGame = updatedGames.find((g) => g.id === gameId);
    if (updatedGame) {
      saveGameToCloud(updatedGame);
      // Synchronize Google Sheets "Borrowed by" column in owner's tab
      fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_borrow',
          ownerHousehold: updatedGame.owner,
          gameTitle: updatedGame.title,
          borrowerName: canonicalBorrower,
        }),
      }).catch(() => {});
    }
    changedReqs.forEach((r) => saveRequestToCloud(r));

    // Auto-update selectedGame if open
    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  const handleReturnConfirm = (gameId: string, notes?: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    const nowIso = new Date().toISOString();
    const canonicalOwner = getCanonicalName(targetGame.owner, friends);

    const newHistoryRecord = {
      id: `hist-${Date.now()}`,
      borrower: targetGame.currentBorrower || 'Friend',
      borrowDate: targetGame.borrowDate || nowIso,
      returnDate: nowIso,
      notes: notes || undefined,
    };

    // Fulfill accepted handoffs or owner-return requests, while keeping third-party pending requests active
    // and updating their holderName to the owner who now holds the game again!
    const changedReqs: BorrowRequest[] = [];
    const updatedRequests = requests.map((r) => {
      if (r.gameId !== gameId) return r;
      if (r.status === 'accepted' || (r.status === 'pending' && isSameHousehold(r.requesterName, canonicalOwner, friends))) {
        const next: BorrowRequest = { ...r, status: 'fulfilled', confirmedAt: nowIso };
        changedReqs.push(next);
        return next;
      }
      if (r.status === 'pending' && r.holderName !== canonicalOwner) {
        const next: BorrowRequest = { ...r, holderName: canonicalOwner };
        changedReqs.push(next);
        return next;
      }
      return r;
    });

    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        status: 'available' as const,
        currentBorrower: null,
        borrowDate: null,
        expectedReturnDate: null,
        history: [newHistoryRecord, ...(g.history || [])],
        borrowRequests: (g.borrowRequests || []).map((r) => {
          if (r.status === 'accepted' || (r.status === 'pending' && isSameHousehold(r.requesterName, canonicalOwner, friends))) {
            return { ...r, status: 'fulfilled' as const, confirmedAt: nowIso };
          }
          if (r.status === 'pending') {
            return { ...r, holderName: canonicalOwner };
          }
          return r;
        }),
      };
    });

    setGames(updatedGames);
    saveGames(updatedGames);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    const updatedGame = updatedGames.find((g) => g.id === gameId);
    if (updatedGame) {
      saveGameToCloud(updatedGame);
      // Synchronize Google Sheets "Borrowed by" column in owner's tab (cleared)
      fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_borrow',
          ownerHousehold: targetGame.owner,
          gameTitle: targetGame.title,
          borrowerName: null,
        }),
      }).catch(() => {});
    }

    changedReqs.forEach((r) => saveRequestToCloud(r));

    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  // Step 1: Send Borrow Request to the group that currently has it
  const handleRequestExchange = (gameId: string, requester: string, returnDate?: string, notes?: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    const currentHolder = (targetGame.status === 'borrowed' && targetGame.currentBorrower)
      ? targetGame.currentBorrower
      : targetGame.owner;

    const canonicalRequester = getCanonicalName(requester, friends);
    const canonicalHolder = getCanonicalName(currentHolder, friends);

    const newRequest: BorrowRequest = {
      id: `req-${Date.now()}`,
      gameId: targetGame.id,
      gameTitle: targetGame.title,
      requesterName: canonicalRequester,
      holderName: canonicalHolder,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      expectedReturnDate: returnDate || undefined,
      note: notes || undefined,
    };

    // Replace any existing duplicate pending request from the same requester for this game, keeping other households' requests intact
    const supersededRequests = requests.filter(
      (r) => r.gameId === gameId && r.status === 'pending' && isSameHousehold(r.requesterName, canonicalRequester, friends)
    );
    supersededRequests.forEach((r) => deleteRequestFromCloud(r.id));

    const filteredExistingRequests = requests.filter(
      (r) => !(r.gameId === gameId && r.status === 'pending' && isSameHousehold(r.requesterName, canonicalRequester, friends))
    );
    const updatedRequests = [newRequest, ...filteredExistingRequests];
    setRequests(updatedRequests);
    saveRequests(updatedRequests);
    saveRequestToCloud(newRequest);

    // Prompt for Web Notification & App Badge permission if not yet requested
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      const keptRequests = (g.borrowRequests || []).filter(
        (r) => !(r.status === 'pending' && isSameHousehold(r.requesterName, canonicalRequester, friends))
      );
      return {
        ...g,
        borrowRequests: [newRequest, ...keptRequests],
      };
    });

    setGames(updatedGames);
    saveGames(updatedGames);

    const updatedGame = updatedGames.find((g) => g.id === gameId);
    if (updatedGame) {
      saveGameToCloud(updatedGame);
    }

    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  // Step 2: Holder accepts & executes the exchange
  const handleAcceptExchange = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    // Strict profile authorization check: Only the current holder can accept
    const isSelfTest = isSameHousehold(req.holderName, req.requesterName, friends);
    const isAuthorized = Boolean(
      isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, req.holderName, friends))
    );

    if (!isAuthorized) {
      if (!activeHousehold) {
        setIsFirstIdentityPrompt(false);
        setIsIdentityModalOpen(true);
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedRequests = requests.map((r) =>
      r.id === requestId ? { ...r, status: 'accepted' as const, acceptedAt: nowIso } : r
    );
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    const updatedReq = updatedRequests.find((r) => r.id === requestId);
    if (updatedReq) saveRequestToCloud(updatedReq);

    const updatedGames = games.map((g) => {
      if (g.id !== req.gameId) return g;
      return {
        ...g,
        borrowRequests: (g.borrowRequests || []).map((r) =>
          r.id === requestId ? { ...r, status: 'accepted' as const, acceptedAt: nowIso } : r
        ),
      };
    });
    setGames(updatedGames);
    saveGames(updatedGames);

    const updatedGame = updatedGames.find((g) => g.id === req.gameId);
    if (updatedGame) saveGameToCloud(updatedGame);

    if (selectedGame?.id === req.gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === req.gameId) || null);
    }
  };

  // Step 3: Requester confirms receipt -> exchange is complete and marked with new holder!
  const handleConfirmExchange = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    // Strict profile authorization check: Only the requester can confirm receipt
    const isSelfTest = isSameHousehold(req.holderName, req.requesterName, friends);
    const isAuthorized = Boolean(
      isSelfTest || (activeHousehold && isSameHousehold(activeHousehold, req.requesterName, friends))
    );

    if (!isAuthorized) {
      if (!activeHousehold) {
        setIsFirstIdentityPrompt(false);
        setIsIdentityModalOpen(true);
      }
      return;
    }

    const targetGame = games.find((g) => g.id === req.gameId);
    if (!targetGame) return;

    const nowIso = new Date().toISOString();
    const historyUpdates = [...(targetGame.history || [])];

    // If the game was previously with another borrower, close out that loan record
    if (targetGame.status === 'borrowed' && targetGame.currentBorrower) {
      historyUpdates.unshift({
        id: `hist-${Date.now()}`,
        borrower: targetGame.currentBorrower,
        borrowDate: targetGame.borrowDate || req.requestedAt,
        returnDate: nowIso,
        notes: req.note ? `Transferred to ${req.requesterName} (${req.note})` : `Transferred to ${req.requesterName}`,
      });
    }

    const isReturningToOwner = isSameHousehold(req.requesterName, targetGame.owner, friends);
    const canonicalRequester = getCanonicalName(req.requesterName, friends);
    const canonicalOwner = getCanonicalName(targetGame.owner, friends);
    const newHolderName = isReturningToOwner ? canonicalOwner : canonicalRequester;

    const updatedGame: Game = {
      ...targetGame,
      status: isReturningToOwner ? 'available' : ('borrowed' as const),
      currentBorrower: isReturningToOwner ? null : canonicalRequester,
      borrowDate: isReturningToOwner ? null : nowIso,
      expectedReturnDate: isReturningToOwner ? null : (req.expectedReturnDate || null),
      history: historyUpdates,
      borrowRequests: (targetGame.borrowRequests || []).map((r) => {
        if (r.id === requestId) {
          return { ...r, status: 'fulfilled' as const, confirmedAt: nowIso };
        }
        if (r.status === 'pending') {
          return { ...r, holderName: newHolderName };
        }
        return r;
      }),
    };

    const updatedGames = games.map((g) => (g.id === targetGame.id ? updatedGame : g));
    const changedReqs: BorrowRequest[] = [];
    const updatedRequests = requests.map((r) => {
      if (r.id === requestId) {
        const next: BorrowRequest = { ...r, status: 'fulfilled', confirmedAt: nowIso };
        changedReqs.push(next);
        return next;
      }
      if (r.gameId === targetGame.id && r.status === 'pending' && r.holderName !== newHolderName) {
        const next: BorrowRequest = { ...r, holderName: newHolderName };
        changedReqs.push(next);
        return next;
      }
      return r;
    });

    setGames(updatedGames);
    saveGames(updatedGames);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    changedReqs.forEach((r) => saveRequestToCloud(r));
    saveGameToCloud(updatedGame);

    // Synchronize Google Sheets "Borrowed by" column in owner's tab
    fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_borrow',
        ownerHousehold: targetGame.owner,
        gameTitle: targetGame.title,
        borrowerName: isReturningToOwner ? null : req.requesterName,
      }),
    }).catch(() => {});

    if (selectedGame?.id === targetGame.id) {
      setSelectedGame(updatedGame);
    }
  };

  const handleDismissRequest = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    const updatedRequests = requests.filter((r) => r.id !== requestId);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);
    deleteRequestFromCloud(requestId);

    if (req) {
      const updatedGames = games.map((g) => {
        if (g.id !== req.gameId) return g;
        return {
          ...g,
          borrowRequests: (g.borrowRequests || []).filter((r) => r.id !== requestId),
        };
      });
      setGames(updatedGames);
      saveGames(updatedGames);

      const updatedGame = updatedGames.find((g) => g.id === req.gameId);
      if (updatedGame) saveGameToCloud(updatedGame);

      if (selectedGame?.id === req.gameId) {
        setSelectedGame(updatedGames.find((g) => g.id === req.gameId) || null);
      }
    }
  };

  const handleAddGame = (newGameData: Omit<Game, 'id' | 'status' | 'history'>) => {
    const existingGame = games.find(
      (g) =>
        isSameHousehold(g.owner, newGameData.owner, friends) &&
        matchesTitleEntity(g.title, newGameData.title)
    );

    if (existingGame) {
      const mergedGame: Game = {
        ...existingGame,
        ...newGameData,
        id: existingGame.id,
        status: existingGame.status,
        currentBorrower: existingGame.currentBorrower,
        borrowDate: existingGame.borrowDate,
        expectedReturnDate: existingGame.expectedReturnDate,
        history: existingGame.history || [],
        borrowRequests: existingGame.borrowRequests || [],
      };
      const updated = games.map((g) => (g.id === existingGame.id ? mergedGame : g));
      setGames(updated);
      saveGames(updated);
      saveGameToCloud(mergedGame);

      fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_game_details',
          previousOwnerHousehold: existingGame.owner,
          previousGameTitle: existingGame.title,
          updatedGame: mergedGame,
        }),
      }).catch(() => {});
      return;
    }

    const newGame: Game = {
      ...newGameData,
      id: `game-${Date.now()}`,
      status: 'available',
      currentBorrower: null,
      borrowDate: null,
      expectedReturnDate: null,
      history: [],
      borrowRequests: [],
    };
    const updated = [newGame, ...games];
    setGames(updated);
    saveGames(updated);
    saveGameToCloud(newGame);

    // Synchronize Google Sheets by appending new game row
    fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_game',
        ownerHousehold: newGame.owner,
        game: newGame,
      }),
    }).catch(() => {});
  };

  const handleBatchImportGames = (importedGames: Omit<Game, 'id' | 'status' | 'history'>[]) => {
    const deduplicated = importedGames.filter(
      (imp) =>
        !games.some(
          (existing) =>
            isSameHousehold(existing.owner, imp.owner, friends) &&
            matchesTitleEntity(existing.title, imp.title)
        )
    );
    if (deduplicated.length === 0) return;

    const createdGames: Game[] = deduplicated.map((g, idx) => ({
      ...g,
      id: `game-import-${Date.now()}-${idx}`,
      status: 'available',
      currentBorrower: null,
      borrowDate: null,
      expectedReturnDate: null,
      history: [],
      borrowRequests: [],
    }));
    const updated = [...createdGames, ...games];
    setGames(updated);
    saveGames(updated);
    saveGamesBatchToCloud(createdGames);

    const byOwner = new Map<string, Game[]>();
    for (const g of createdGames) {
      const list = byOwner.get(g.owner) || [];
      list.push(g);
      byOwner.set(g.owner, list);
    }

    for (const [ownerHousehold, ownerGames] of byOwner.entries()) {
      fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_games_batch',
          ownerHousehold,
          games: ownerGames,
        }),
      }).catch(() => {});
    }
  };

  const handleUpdateFriends = (updatedFriends: string[]) => {
    setFriends(updatedFriends);
    saveFriends(updatedFriends);
    saveHouseholdsToCloud(updatedFriends);
    if (activeHousehold && !updatedFriends.some((f) => isSameHousehold(f, activeHousehold, updatedFriends))) {
      setActiveHousehold(null);
      saveActiveHousehold('');
    }
    if (filters.owner !== 'all' && !updatedFriends.some((f) => isSameHousehold(f, filters.owner, updatedFriends))) {
      setFilters((prev) => ({ ...prev, owner: 'all' }));
    }
  };

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

  const handleSaveEditedGame = (updatedGame: Game) => {
    const prevGame = editingGame;
    let mergedTarget: Game = updatedGame;
    const nextGames = games.map((g) => {
      if (g.id !== updatedGame.id) return g;
      mergedTarget = {
        ...g,
        ...updatedGame,
        status: g.status,
        currentBorrower: g.currentBorrower,
        borrowDate: g.borrowDate,
        expectedReturnDate: g.expectedReturnDate,
        history: g.history,
        borrowRequests: g.borrowRequests,
      };
      return mergedTarget;
    });
    setGames(nextGames);
    saveGames(nextGames);
    saveGameToCloud(mergedTarget);
    if (selectedGame && selectedGame.id === updatedGame.id) {
      setSelectedGame(mergedTarget);
    }

    // Two-way sync: push edited game details (name, player range, playtime, notes, type) to Google Sheets
    fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_game_details',
        previousOwnerHousehold: prevGame?.owner || mergedTarget.owner,
        previousGameTitle: prevGame?.title || mergedTarget.title,
        updatedGame: mergedTarget,
      }),
    }).catch((err) => console.warn('Failed to sync game details to Google Sheets:', err));
  };

  const handleSyncGamesFromSheets = (sheetGames: SheetRowGame[], rosterOverride?: string[]) => {
    if (!sheetGames || sheetGames.length === 0) return;
    const activeFriends = rosterOverride && rosterOverride.length > 0 ? rosterOverride : friends;
    setGames((prevGames) => {
      let changed = false;
      const matchedSheetIndices = new Set<number>();
      const changedGamesForCloud: Game[] = [];

      const updated = prevGames.map((game) => {
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
        const newBorrower =
          match.borrowedBy !== undefined
            ? match.borrowedBy
              ? getCanonicalName(match.borrowedBy, activeFriends)
              : null
            : (game.currentBorrower ?? null);
        const newStatus: 'available' | 'borrowed' = newBorrower ? 'borrowed' : 'available';

        if (
          newTitle !== game.title ||
          newMinP !== game.minPlayers ||
          newMaxP !== game.maxPlayers ||
          newType !== game.type ||
          newMinPlaytime !== game.minPlaytime ||
          newMaxPlaytime !== game.maxPlaytime ||
          newPlaytimeDisplay !== game.playtimeDisplay ||
          newNotes !== (game.notes || '') ||
          newBorrower !== (game.currentBorrower ?? null) ||
          newStatus !== game.status
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
            status: newStatus,
            currentBorrower: newBorrower,
            borrowDate: newBorrower ? (game.borrowDate || new Date().toISOString()) : null,
          };
          changedGamesForCloud.push(nextGame);
          return nextGame;
        }
        return game;
      });

      // Import any newly added rows from Google Sheets that aren't in prevGames yet
      const newSheetGames: Game[] = [];
      sheetGames.forEach((sg, idx) => {
        if (!matchedSheetIndices.has(idx) && sg.title) {
          changed = true;
          const borrower = sg.borrowedBy ? getCanonicalName(sg.borrowedBy, activeFriends) : null;
          const minPlay = sg.minPlaytime ?? sg.playtime ?? 30;
          const maxPlay = sg.maxPlaytime ?? Math.max(minPlay, 60);
          const created: Game = {
            id: `sheet-${Date.now()}-${idx}`,
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
          newSheetGames.push(created);
          changedGamesForCloud.push(created);
        }
      });

      const finalGames = newSheetGames.length > 0 ? [...newSheetGames, ...updated] : updated;

      if (changed) {
        saveGames(finalGames);
        saveGamesBatchToCloud(changedGamesForCloud);
      }
      return changed ? finalGames : prevGames;
    });
  };

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
