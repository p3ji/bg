'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Game, BorrowRequest, ViewMode, FilterState } from '@/types';
import { 
  getInitialGames, 
  saveGames, 
  getInitialRequests, 
  saveRequests, 
  getInitialFriends, 
  saveFriends,
  resetToSeedData,
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
import { DEFAULT_FRIENDS } from '@/data/friends';
import { registerServiceWorker, updateHomeScreenAppBadge } from '@/lib/badgeManager';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { BookshelfView } from '@/components/BookshelfView';
import { TableView } from '@/components/TableView';
import { GameDetailModal } from '@/components/GameDetailModal';
import { BorrowModal } from '@/components/BorrowModal';
import { ReturnModal } from '@/components/ReturnModal';
import { RequestBorrowModal } from '@/components/RequestBorrowModal';
import { NotificationsModal } from '@/components/NotificationsModal';
import { BggSyncModal } from '@/components/BggSyncModal';
import { SettingsModal } from '@/components/SettingsModal';
import { EditGameModal } from '@/components/EditGameModal';
import { IdentityModal } from '@/components/IdentityModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { HomeNotificationBanner } from '@/components/HomeNotificationBanner';

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
  const [returningGame, setReturningGame] = useState<Game | null>(null);
  const [requestingGame, setRequestingGame] = useState<Game | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBggSyncOpen, setIsBggSyncOpen] = useState(false);
  const [selectedHouseholdForAdd, setSelectedHouseholdForAdd] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // 1-Tap Household Identity
  const [activeHousehold, setActiveHousehold] = useState<string | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isFirstIdentityPrompt, setIsFirstIdentityPrompt] = useState(false);

  // Initialize data on mount
  useEffect(() => {
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
    seedCloudDatabaseIfNeeded(initialGames, DEFAULT_FRIENDS).catch(() => {});

    // Real-time Cloud Firestore Subscriptions across all friend devices
    const unsubCloudGames = subscribeToCloudGames((cloudGames) => {
      if (cloudGames && cloudGames.length > 0) {
        setGames(cloudGames);
        saveGames(cloudGames);
      }
    });

    const unsubCloudRequests = subscribeToCloudRequests((cloudRequests) => {
      setRequests(cloudRequests);
      saveRequests(cloudRequests);
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

  const normalizeName = (name?: string | null) => {
    if (!name) return '';
    return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  };

  // Profile-specific actionable requests:
  // - Step 1: Active profile is holder of a pending request (action needed: Accept & Hand Off)
  // - Step 2: Active profile is requester of an accepted request (action needed: Confirm Receipt)
  // - Self-borrow test mode counts for both steps
  // If no profile is active, count is 0
  const myActionableRequests = useMemo(() => {
    if (!activeHousehold) return [];
    return requests.filter((r) => {
      const isSelfTest = normalizeName(r.holderName) === normalizeName(r.requesterName);
      if (r.status === 'pending') {
        return isSelfTest || normalizeName(r.holderName) === normalizeName(activeHousehold);
      }
      if (r.status === 'accepted') {
        return isSelfTest || normalizeName(r.requesterName) === normalizeName(activeHousehold);
      }
      return false;
    });
  }, [requests, activeHousehold]);

  // Outgoing requests submitted by this profile that are waiting on friends
  const myWaitingRequests = useMemo(() => {
    if (!activeHousehold) return [];
    return requests.filter((r) => {
      const isSelfTest = normalizeName(r.holderName) === normalizeName(r.requesterName);
      if (isSelfTest) return false;
      if (r.status === 'pending') {
        return normalizeName(r.requesterName) === normalizeName(activeHousehold);
      }
      if (r.status === 'accepted') {
        return normalizeName(r.holderName) === normalizeName(activeHousehold);
      }
      return false;
    });
  }, [requests, activeHousehold]);

  // Badge counter strictly reflects the active profile's required actions
  const pendingRequestsCount = myActionableRequests.length;

  useEffect(() => {
    updateHomeScreenAppBadge(pendingRequestsCount);
  }, [pendingRequestsCount]);

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    return games
      .filter((game) => {
        // Search query
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchTitle = game.title.toLowerCase().includes(q);
          const matchType = (game.type || '').toLowerCase().includes(q);
          const matchNotes = (game.notes || '').toLowerCase().includes(q);
          const matchBorrower = (game.currentBorrower || '').toLowerCase().includes(q);
          if (!matchTitle && !matchType && !matchNotes && !matchBorrower) return false;
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
          if (game.minPlaytime > filters.maxPlaytime) return false;
        }

        // Availability
        if (filters.availability === 'available' && game.status !== 'available') return false;
        if (filters.availability === 'borrowed' && game.status !== 'borrowed') return false;

        // Owner Household
        if (filters.owner !== 'all' && game.owner !== filters.owner) return false;

        // Type / Category
        if (filters.type !== 'all' && !game.type.toLowerCase().includes(filters.type.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'rank': {
            const rA = a.bggRank ?? 999999;
            const rB = b.bggRank ?? 999999;
            return rA - rB;
          }
          case 'rating': {
            const rateA = a.bggRating ?? 0;
            const rateB = b.bggRating ?? 0;
            return rateB - rateA;
          }
          case 'playtime': {
            return (a.minPlaytime || 0) - (b.minPlaytime || 0);
          }
          case 'weight': {
            return (b.weight || 0) - (a.weight || 0);
          }
          case 'players': {
            return (b.maxPlayers || 0) - (a.maxPlayers || 0);
          }
          case 'title':
          default:
            return a.title.localeCompare(b.title);
        }
      });
  }, [games, filters]);

  // Inventory stats
  const availableCount = useMemo(() => games.filter((g) => g.status === 'available').length, [games]);
  const borrowedCount = useMemo(() => games.filter((g) => g.status === 'borrowed').length, [games]);

  // Action Handlers
  const handleBorrowConfirm = (gameId: string, borrower: string, returnDate?: string, notes?: string) => {
    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        status: 'borrowed' as const,
        currentBorrower: borrower,
        borrowDate: new Date().toISOString(),
        expectedReturnDate: returnDate || null,
        notes: notes ? (g.notes ? `${g.notes} | ${notes}` : notes) : g.notes,
      };
    });

    // Also mark any pending requests by this borrower as fulfilled
    const updatedRequests = requests.map((r) => {
      if (r.gameId === gameId && r.requesterName.toLowerCase() === borrower.toLowerCase() && (r.status === 'pending' || r.status === 'accepted')) {
        return { ...r, status: 'fulfilled' as const, confirmedAt: new Date().toISOString() };
      }
      return r;
    });

    setGames(updatedGames);
    saveGames(updatedGames);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    const updatedGame = updatedGames.find((g) => g.id === gameId);
    if (updatedGame) saveGameToCloud(updatedGame);
    updatedRequests.filter((r) => r.gameId === gameId).forEach((r) => saveRequestToCloud(r));

    // Auto-update selectedGame if open
    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  const handleReturnConfirm = (gameId: string, notes?: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    const newHistoryRecord = {
      id: `hist-${Date.now()}`,
      borrower: targetGame.currentBorrower || 'Friend',
      borrowDate: targetGame.borrowDate || new Date().toISOString(),
      returnDate: new Date().toISOString(),
      notes: notes || undefined,
    };

    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        status: 'available' as const,
        currentBorrower: null,
        borrowDate: null,
        expectedReturnDate: null,
        history: [newHistoryRecord, ...(g.history || [])],
      };
    });

    setGames(updatedGames);
    saveGames(updatedGames);

    const updatedGame = updatedGames.find((g) => g.id === gameId);
    if (updatedGame) saveGameToCloud(updatedGame);

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

    const newRequest: BorrowRequest = {
      id: `req-${Date.now()}`,
      gameId: targetGame.id,
      gameTitle: targetGame.title,
      requesterName: requester,
      holderName: currentHolder,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      expectedReturnDate: returnDate || undefined,
      note: notes || undefined,
    };

    const updatedRequests = [newRequest, ...requests];
    setRequests(updatedRequests);
    saveRequests(updatedRequests);
    saveRequestToCloud(newRequest);

    // Prompt for Web Notification & App Badge permission if not yet requested
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        borrowRequests: [newRequest, ...(g.borrowRequests || []).filter((r) => r.status === 'fulfilled' || r.status === 'cancelled')],
      };
    });

    setGames(updatedGames);
    saveGames(updatedGames);

    const updatedGame = updatedGames.find((g) => g.id === gameId);
    if (updatedGame) saveGameToCloud(updatedGame);

    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  // Step 2: Holder accepts & executes the exchange
  const handleAcceptExchange = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    // Strict profile authorization check: Only the current holder can accept
    const isSelfTest = normalizeName(req.holderName) === normalizeName(req.requesterName);
    const isAuthorized = Boolean(
      isSelfTest || (activeHousehold && normalizeName(activeHousehold) === normalizeName(req.holderName))
    );

    if (!isAuthorized) {
      if (!activeHousehold) {
        setIsFirstIdentityPrompt(false);
        setIsIdentityModalOpen(true);
      } else {
        alert(`Only ${req.holderName} can accept this borrow request. Your profile is currently set to ${activeHousehold}.`);
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
    const isSelfTest = normalizeName(req.holderName) === normalizeName(req.requesterName);
    const isAuthorized = Boolean(
      isSelfTest || (activeHousehold && normalizeName(activeHousehold) === normalizeName(req.requesterName))
    );

    if (!isAuthorized) {
      if (!activeHousehold) {
        setIsFirstIdentityPrompt(false);
        setIsIdentityModalOpen(true);
      } else {
        alert(`Only ${req.requesterName} can confirm receipt of this game. Your profile is currently set to ${activeHousehold}.`);
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
        notes: `Transferred to ${req.requesterName}`,
      });
    }

    const updatedGame: Game = {
      ...targetGame,
      status: 'borrowed' as const,
      currentBorrower: req.requesterName,
      borrowDate: nowIso,
      expectedReturnDate: req.expectedReturnDate || null,
      notes: req.note ? (targetGame.notes ? `${targetGame.notes} | ${req.note}` : req.note) : targetGame.notes,
      history: historyUpdates,
      borrowRequests: (targetGame.borrowRequests || []).map((r) =>
        r.id === requestId ? { ...r, status: 'fulfilled' as const, confirmedAt: nowIso } : r
      ),
    };

    const updatedGames = games.map((g) => (g.id === targetGame.id ? updatedGame : g));
    const updatedRequests = requests.map((r) =>
      r.id === requestId ? { ...r, status: 'fulfilled' as const, confirmedAt: nowIso } : r
    );

    setGames(updatedGames);
    saveGames(updatedGames);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    const updatedReq = updatedRequests.find((r) => r.id === requestId);
    if (updatedReq) saveRequestToCloud(updatedReq);
    saveGameToCloud(updatedGame);

    if (selectedGame?.id === targetGame.id) {
      setSelectedGame(updatedGame);
    }
  };

  const handleDismissRequest = (requestId: string) => {
    const updatedRequests = requests.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' as const } : r));
    setRequests(updatedRequests);
    saveRequests(updatedRequests);
    deleteRequestFromCloud(requestId);

    const req = requests.find((r) => r.id === requestId);
    if (req) {
      const updatedGames = games.map((g) => {
        if (g.id !== req.gameId) return g;
        return {
          ...g,
          borrowRequests: (g.borrowRequests || []).map((r) =>
            r.id === requestId ? { ...r, status: 'cancelled' as const } : r
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
    }
  };

  const handleAddGame = (newGameData: Omit<Game, 'id' | 'status' | 'history'>) => {
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
  };

  const handleBatchImportGames = (importedGames: Omit<Game, 'id' | 'status' | 'history'>[]) => {
    const createdGames: Game[] = importedGames.map((g, idx) => ({
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
  };

  const handleUpdateFriends = (updatedFriends: string[]) => {
    setFriends(updatedFriends);
    saveFriends(updatedFriends);
    saveHouseholdsToCloud(updatedFriends);
  };

  const handleResetLibrary = () => {
    const restored = resetToSeedData();
    setGames(restored);
    setRequests([]);
    saveRequests([]);
  };

  const handleOpenAddForHousehold = (household: string) => {
    setSelectedHouseholdForAdd(household);
    setIsBggSyncOpen(true);
  };

  const handleOpenGeneralAdd = () => {
    setSelectedHouseholdForAdd(filters.owner !== 'all' ? filters.owner : undefined);
    setIsBggSyncOpen(true);
  };

  const handleSaveEditedGame = (updatedGame: Game) => {
    const nextGames = games.map((g) => (g.id === updatedGame.id ? updatedGame : g));
    setGames(nextGames);
    saveGames(nextGames);
    saveGameToCloud(updatedGame);
    if (selectedGame && selectedGame.id === updatedGame.id) {
      setSelectedGame(updatedGame);
    }
  };

  const handleInitiateBorrow = (game: Game) => {
    if (!activeHousehold) {
      setBorrowingGame(game);
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
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin" />
      </div>
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
        game={selectedGame}
        activeHousehold={activeHousehold}
        isOpen={Boolean(selectedGame)}
        onClose={() => setSelectedGame(null)}
        onBorrow={handleInitiateBorrow}
        onReturn={setReturningGame}
        onRequestBorrow={handleInitiateBorrow}
        onAcceptExchange={handleAcceptExchange}
        onConfirmExchange={handleConfirmExchange}
        onEdit={setEditingGame}
      />

      <BorrowModal
        game={borrowingGame}
        friends={friends}
        isOpen={Boolean(borrowingGame)}
        activeHousehold={activeHousehold}
        onClose={() => setBorrowingGame(null)}
        onRequestExchange={handleRequestExchange}
        onDirectBorrow={handleBorrowConfirm}
      />

      <ReturnModal
        game={returningGame}
        isOpen={Boolean(returningGame)}
        onClose={() => setReturningGame(null)}
        onConfirm={handleReturnConfirm}
      />

      <RequestBorrowModal
        game={requestingGame}
        friends={friends}
        isOpen={Boolean(requestingGame)}
        activeHousehold={activeHousehold}
        onClose={() => setRequestingGame(null)}
        onSubmitRequest={(gameId, requester, note) => handleRequestExchange(gameId, requester, undefined, note)}
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
        friends={friends}
        onClose={() => {
          setIsBggSyncOpen(false);
          setSelectedHouseholdForAdd(undefined);
        }}
        onAddGame={handleAddGame}
        onBatchImportGames={handleBatchImportGames}
        initialHousehold={selectedHouseholdForAdd}
        initialTab={selectedHouseholdForAdd ? 'search' : 'sync'}
      />

      <SettingsModal
        friends={friends}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateFriends={handleUpdateFriends}
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
        }}
        activeHousehold={activeHousehold}
        onSelectHousehold={handleSelectHousehold}
        isInitialPrompt={isFirstIdentityPrompt}
      />

      {/* Mobile Bottom Navigation Bar (thumb-friendly on phones) */}
      <MobileBottomNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pendingRequestsCount={pendingRequestsCount}
        activeHousehold={activeHousehold}
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
