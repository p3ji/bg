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
    setGames(getInitialGames());
    setRequests(getInitialRequests());
    setFriends(getInitialFriends());

    const savedIdentity = getActiveHousehold();
    setActiveHousehold(savedIdentity);
    if (!savedIdentity) {
      setIsFirstIdentityPrompt(true);
      setIsIdentityModalOpen(true);
    }
    setMounted(true);

    const handleGamesUpdate = () => setGames(getInitialGames());
    const handleRequestsUpdate = () => setRequests(getInitialRequests());
    const handleFriendsUpdate = () => setFriends(getInitialFriends());
    const handleIdentityUpdate = () => setActiveHousehold(getActiveHousehold());

    window.addEventListener('bg_games_updated', handleGamesUpdate);
    window.addEventListener('bg_requests_updated', handleRequestsUpdate);
    window.addEventListener('bg_friends_updated', handleFriendsUpdate);
    window.addEventListener('bg_identity_updated', handleIdentityUpdate);

    return () => {
      window.removeEventListener('bg_games_updated', handleGamesUpdate);
      window.removeEventListener('bg_requests_updated', handleRequestsUpdate);
      window.removeEventListener('bg_friends_updated', handleFriendsUpdate);
      window.removeEventListener('bg_identity_updated', handleIdentityUpdate);
    };
  }, []);

  // Update favicon / document title with pending requests badge
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'pending').length;
  }, [requests]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (pendingRequestsCount > 0) {
        document.title = `(${pendingRequestsCount}) GameShare • Friend Board Game Library`;
      } else {
        document.title = 'GameShare • Friend Board Game Library';
      }
    }
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
      if (r.gameId === gameId && r.requesterName.toLowerCase() === borrower.toLowerCase() && r.status === 'pending') {
        return { ...r, status: 'fulfilled' as const };
      }
      return r;
    });

    setGames(updatedGames);
    saveGames(updatedGames);
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

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

    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  const handleRequestBorrowSubmit = (gameId: string, requester: string, note?: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    const newRequest: BorrowRequest = {
      id: `req-${Date.now()}`,
      gameId: targetGame.id,
      gameTitle: targetGame.title,
      requesterName: requester,
      holderName: targetGame.currentBorrower || targetGame.owner,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      note: note || undefined,
    };

    const updatedRequests = [newRequest, ...requests];
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    const updatedGames = games.map((g) => {
      if (g.id !== gameId) return g;
      return {
        ...g,
        borrowRequests: [newRequest, ...(g.borrowRequests || [])],
      };
    });

    setGames(updatedGames);
    saveGames(updatedGames);

    if (selectedGame?.id === gameId) {
      setSelectedGame(updatedGames.find((g) => g.id === gameId) || null);
    }
  };

  const handleFulfillRequest = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const updatedRequests = requests.map((r) => (r.id === requestId ? { ...r, status: 'fulfilled' as const } : r));
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    // If game is still with the holder, hand it over to requester!
    const targetGame = games.find((g) => g.id === req.gameId);
    if (targetGame) {
      handleBorrowConfirm(targetGame.id, req.requesterName, undefined, 'Handed off from request');
    }
  };

  const handleDismissRequest = (requestId: string) => {
    const updatedRequests = requests.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' as const } : r));
    setRequests(updatedRequests);
    saveRequests(updatedRequests);
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
  };

  const handleUpdateFriends = (updatedFriends: string[]) => {
    setFriends(updatedFriends);
    saveFriends(updatedFriends);
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
    if (selectedGame && selectedGame.id === updatedGame.id) {
      setSelectedGame(updatedGame);
    }
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

      {/* Main Content Area */}
      <main className="flex-1">
        {viewMode === 'bookshelf' ? (
          <BookshelfView
            games={filteredGames}
            activeHousehold={filters.owner}
            onSelectGame={setSelectedGame}
            onBorrow={setBorrowingGame}
            onReturn={setReturningGame}
            onRequestBorrow={setRequestingGame}
            onResetFilters={() => setFilters(initialFilters)}
            onAddForHousehold={handleOpenAddForHousehold}
            onEdit={setEditingGame}
          />
        ) : (
          <TableView
            games={filteredGames}
            activeHousehold={filters.owner}
            onSelectGame={setSelectedGame}
            onBorrow={setBorrowingGame}
            onReturn={setReturningGame}
            onRequestBorrow={setRequestingGame}
            onResetFilters={() => setFilters(initialFilters)}
            onAddForHousehold={handleOpenAddForHousehold}
            onEdit={setEditingGame}
          />
        )}
      </main>

      {/* Modals */}
      <GameDetailModal
        game={selectedGame}
        isOpen={Boolean(selectedGame)}
        onClose={() => setSelectedGame(null)}
        onBorrow={setBorrowingGame}
        onReturn={setReturningGame}
        onRequestBorrow={setRequestingGame}
        onEdit={setEditingGame}
      />

      <BorrowModal
        game={borrowingGame}
        friends={friends}
        isOpen={Boolean(borrowingGame)}
        activeHousehold={activeHousehold}
        onClose={() => setBorrowingGame(null)}
        onConfirm={handleBorrowConfirm}
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
        onSubmitRequest={handleRequestBorrowSubmit}
      />

      <NotificationsModal
        requests={requests}
        games={games}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onFulfillRequest={handleFulfillRequest}
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
        onResetLibrary={handleResetLibrary}
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

    </div>
  );
}
