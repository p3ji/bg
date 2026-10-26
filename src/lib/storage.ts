import { Game, BorrowRequest } from '@/types';
import seedData from '@/data/seedGames.json';
import { DEFAULT_FRIENDS } from '@/data/friends';

const GAMES_STORAGE_KEY = 'bg_share_games_v5';
const REQUESTS_STORAGE_KEY = 'bg_share_requests_v3';
const FRIENDS_STORAGE_KEY = 'bg_share_households_v1';
const BGG_TOKEN_KEY = 'bg_share_bgg_token_v1';

export function getInitialGames(): Game[] {
  const seedList = seedData as unknown as Game[];
  if (typeof window === 'undefined') {
    return seedList;
  }
  try {
    const stored =
      localStorage.getItem(GAMES_STORAGE_KEY) ||
      localStorage.getItem('bg_share_games_v4') ||
      localStorage.getItem('bg_share_games_v3') ||
      localStorage.getItem('bg_share_games_v1');

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Build maps for both ID and title matching
        const seedMapById = new Map(seedList.map((g) => [g.id, g]));
        const seedMapByTitle = new Map(seedList.map((g) => [(g.title || '').toLowerCase().trim(), g]));

        const merged = parsed.map((game: Game) => {
          const seed = seedMapById.get(game.id) || seedMapByTitle.get((game.title || '').toLowerCase().trim());
          if (seed) {
            // Update to verified official seed metadata while preserving user loan history and borrow states
            return {
              ...seed,
              status: game.status || seed.status,
              currentBorrower: game.currentBorrower !== undefined ? game.currentBorrower : seed.currentBorrower,
              borrowDate: game.borrowDate !== undefined ? game.borrowDate : seed.borrowDate,
              expectedReturnDate: game.expectedReturnDate !== undefined ? game.expectedReturnDate : seed.expectedReturnDate,
              history: Array.isArray(game.history) && game.history.length > 0 ? game.history : (seed.history || []),
              borrowRequests: Array.isArray(game.borrowRequests) && game.borrowRequests.length > 0 ? game.borrowRequests : (seed.borrowRequests || []),
              notes: game.notes !== undefined && game.notes !== '' ? game.notes : (seed.notes || ''),
            };
          }
          return game;
        });

        // Add any seed items not present in parsed
        const existingIds = new Set(merged.map((g: Game) => g.id));
        for (const seed of seedList) {
          if (!existingIds.has(seed.id)) {
            merged.push(seed);
          }
        }

        localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.error('Failed to read games from localStorage:', err);
  }

  // Fallback to fresh seed data
  localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(seedList));
  return seedList;
}

export function forceRefreshAllImages(): Game[] {
  const seedList = seedData as unknown as Game[];
  if (typeof window === 'undefined') return seedList;
  try {
    const current = getInitialGames();
    const seedMapById = new Map(seedList.map((g) => [g.id, g]));
    const seedMapByTitle = new Map(seedList.map((g) => [(g.title || '').toLowerCase().trim(), g]));

    const refreshed = current.map((game: Game) => {
      const seed = seedMapById.get(game.id) || seedMapByTitle.get((game.title || '').toLowerCase().trim());
      if (seed) {
        return {
          ...game,
          image: seed.image,
          thumbnail: seed.thumbnail,
          bggId: seed.bggId,
          bggRating: seed.bggRating,
          bggRank: seed.bggRank,
          weight: seed.weight,
          year: seed.year,
        };
      }
      return game;
    });

    saveGames(refreshed);
    return refreshed;
  } catch (err) {
    console.error('Failed to force refresh images:', err);
    return seedList;
  }
}

export function saveGames(games: Game[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    window.dispatchEvent(new Event('bg_games_updated'));
  } catch (err) {
    console.error('Failed to save games to localStorage:', err);
  }
}

export function updateGame(updatedGame: Game): void {
  if (typeof window === 'undefined') return;
  try {
    const currentGames = getInitialGames();
    const index = currentGames.findIndex((g) => g.id === updatedGame.id);
    if (index !== -1) {
      currentGames[index] = updatedGame;
      saveGames(currentGames);
    }
  } catch (err) {
    console.error('Failed to update game in localStorage:', err);
  }
}

export function getInitialRequests(): BorrowRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Failed to read requests from localStorage:', err);
  }
  return [];
}

export function saveRequests(requests: BorrowRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new Event('bg_requests_updated'));
  } catch (err) {
    console.error('Failed to save requests to localStorage:', err);
  }
}

export function getStoredFriends(): string[] {
  if (typeof window === 'undefined') return DEFAULT_FRIENDS;
  try {
    const stored = localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load friends from localStorage:', err);
  }
  return DEFAULT_FRIENDS;
}

export function saveStoredFriends(friends: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends));
  } catch (err) {
    console.error('Failed to save friends to localStorage:', err);
  }
}

export function getBggToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BGG_TOKEN_KEY);
}

export function saveBggToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem(BGG_TOKEN_KEY);
  } else {
    localStorage.setItem(BGG_TOKEN_KEY, token);
  }
}

export function resetLibrary(): Game[] {
  const seedList = seedData as unknown as Game[];
  if (typeof window === 'undefined') return seedList;
  localStorage.removeItem(GAMES_STORAGE_KEY);
  localStorage.removeItem(REQUESTS_STORAGE_KEY);
  localStorage.removeItem('bg_share_games_v4');
  localStorage.removeItem('bg_share_games_v3');
  localStorage.removeItem('bg_share_games_v1');
  localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(seedList));
  window.dispatchEvent(new Event('bg_games_updated'));
  window.dispatchEvent(new Event('bg_requests_updated'));
  return seedList;
}

export const getInitialFriends = getStoredFriends;
export const saveFriends = saveStoredFriends;
export const resetToSeedData = resetLibrary;

