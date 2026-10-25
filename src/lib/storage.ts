import { Game, BorrowRequest } from '@/types';
import seedData from '@/data/seedGames.json';
import { DEFAULT_FRIENDS } from '@/data/friends';

const GAMES_STORAGE_KEY = 'bg_share_games_v4';
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
      localStorage.getItem('bg_share_games_v3') ||
      localStorage.getItem('bg_share_games_v1');

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Build seed map for image & bggId enrichment
        const seedMap = new Map(seedList.map((g) => [g.title.toLowerCase().trim(), g]));
        const merged = parsed.map((game: Game) => {
          const seed = seedMap.get((game.title || '').toLowerCase().trim());
          const isWikimedia = (game.image || '').includes('wikimedia.org');
          const isMissingImage = !game.image && !game.thumbnail;
          
          if (seed && (isWikimedia || isMissingImage || !game.bggId)) {
            return {
              ...game,
              image: isWikimedia || isMissingImage ? seed.image : game.image,
              thumbnail: isWikimedia || isMissingImage ? seed.thumbnail : game.thumbnail,
              bggId: game.bggId || seed.bggId,
              bggRating: game.bggRating || seed.bggRating,
              bggRank: game.bggRank || seed.bggRank,
              weight: game.weight || seed.weight,
            };
          }
          return game;
        });

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

