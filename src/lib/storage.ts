import { Game, BorrowRequest } from '@/types';
import seedData from '@/data/seedGames.json';
import { DEFAULT_FRIENDS } from '@/data/friends';

const GAMES_STORAGE_KEY = 'bg_share_games_v8';
const REQUESTS_STORAGE_KEY = 'bg_share_requests_v4';
const FRIENDS_STORAGE_KEY = 'bg_share_households_v1';
const BGG_TOKEN_KEY = 'bg_share_bgg_token_v1';
const ACTIVE_HOUSEHOLD_KEY = 'bg_active_user_household_v1';

export function getActiveHousehold(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
}

export function saveActiveHousehold(household: string | null): void {
  if (typeof window === 'undefined') return;
  if (!household) {
    localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
  } else {
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, household);
  }
  window.dispatchEvent(new Event('bg_identity_updated'));
}

function getOwnerTitleKey(owner?: string, title?: string): string {
  return `${(owner || '').toLowerCase().trim()}::${(title || '').toLowerCase().trim()}`;
}

function sanitizeCachedPlaytime(game: Game, seed?: Game): Pick<Game, 'minPlaytime' | 'maxPlaytime' | 'playtimeDisplay'> {
  let minPlaytime = game.minPlaytime;
  let maxPlaytime = game.maxPlaytime;
  let playtimeDisplay = game.playtimeDisplay;

  // Repair legacy Excel date serial numbers (> 10000) cached in localStorage
  if (minPlaytime > 10000 || maxPlaytime > 10000) {
    minPlaytime = seed ? seed.minPlaytime : 15;
    maxPlaytime = seed ? seed.maxPlaytime : 30;
    playtimeDisplay = seed?.playtimeDisplay || `${minPlaytime}-${maxPlaytime}m`;
  }
  if (typeof minPlaytime === 'number' && typeof maxPlaytime === 'number' && maxPlaytime < minPlaytime) {
    maxPlaytime = minPlaytime;
  }
  if (typeof playtimeDisplay === 'string') {
    const clean = playtimeDisplay
      .trim()
      .replace(/\s*(?:mins?|minutes?|m)\s*$/i, '')
      .replace(/^(\d+)\.0$/, '$1')
      .replace(/--+/g, '-')
      .trim();
    playtimeDisplay = clean ? `${clean}m` : `${minPlaytime || 30}m`;
  }
  return { minPlaytime, maxPlaytime, playtimeDisplay };
}

export function getInitialGames(): Game[] {
  const seedList = seedData as unknown as Game[];
  if (typeof window === 'undefined') {
    return seedList;
  }
  try {
    const stored = localStorage.getItem(GAMES_STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Build maps for ID and composite (owner + title) matching to avoid cross-household collisions
        const seedMapById = new Map(seedList.map((g) => [g.id, g]));
        const seedMapByOwnerTitle = new Map(seedList.map((g) => [getOwnerTitleKey(g.owner, g.title), g]));

        const merged = parsed.map((game: Game) => {
          const seed = seedMapById.get(game.id) || seedMapByOwnerTitle.get(getOwnerTitleKey(game.owner, game.title));
          const cleanedPlaytime = sanitizeCachedPlaytime(game, seed);
          if (seed) {
            // Keep user edits and dynamic state as primary; only backfill undefined fields from seed
            return {
              ...seed,
              ...game,
              ...cleanedPlaytime,
              image: game.image !== undefined ? game.image : seed.image,
              thumbnail: game.thumbnail !== undefined ? game.thumbnail : seed.thumbnail,
              bggId: game.bggId ?? seed.bggId,
              bggRating: game.bggRating ?? seed.bggRating,
              bggRank: game.bggRank !== undefined ? game.bggRank : seed.bggRank,
              weight: game.weight ?? seed.weight,
              history: Array.isArray(game.history) ? game.history : (seed.history || []),
              borrowRequests: Array.isArray(game.borrowRequests) ? game.borrowRequests : (seed.borrowRequests || []),
              notes: game.notes !== undefined ? game.notes : (seed.notes || ''),
            };
          }
          return {
            ...game,
            ...cleanedPlaytime,
          };
        });

        // Add any seed items not present in parsed (matching by ID or owner+title)
        const existingIds = new Set(merged.map((g: Game) => g.id));
        const existingOwnerTitles = new Set(merged.map((g: Game) => getOwnerTitleKey(g.owner, g.title)));
        for (const seed of seedList) {
          if (!existingIds.has(seed.id) && !existingOwnerTitles.has(getOwnerTitleKey(seed.owner, seed.title))) {
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
    const seedMapByOwnerTitle = new Map(seedList.map((g) => [getOwnerTitleKey(g.owner, g.title), g]));

    const refreshed = current.map((game: Game) => {
      const seed = seedMapById.get(game.id) || seedMapByOwnerTitle.get(getOwnerTitleKey(game.owner, game.title));
      if (seed) {
        return {
          ...game,
          image: game.image || seed.image,
          thumbnail: game.thumbnail || seed.thumbnail,
          bggId: game.bggId ?? seed.bggId,
          bggRating: game.bggRating ?? seed.bggRating,
          bggRank: game.bggRank ?? seed.bggRank,
          weight: game.weight ?? seed.weight,
          year: game.year ?? seed.year,
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

export function saveGames(games: Game[], options?: { emitEvent?: boolean }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    if (options?.emitEvent !== false) {
      window.dispatchEvent(new Event('bg_games_updated'));
    }
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

export function saveRequests(requests: BorrowRequest[], options?: { emitEvent?: boolean }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    if (options?.emitEvent !== false) {
      window.dispatchEvent(new Event('bg_requests_updated'));
    }
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
  localStorage.removeItem('bg_share_games_v6');
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

