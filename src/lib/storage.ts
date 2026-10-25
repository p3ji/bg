import { Game, BorrowRequest } from '@/types';
import seedData from '@/data/seedGames.json';
import { DEFAULT_FRIENDS } from '@/data/friends';

const GAMES_STORAGE_KEY = 'bg_share_games_v3';
const REQUESTS_STORAGE_KEY = 'bg_share_requests_v3';
const FRIENDS_STORAGE_KEY = 'bg_share_households_v1';
const BGG_TOKEN_KEY = 'bg_share_bgg_token_v1';

export function getInitialGames(): Game[] {
  const seedList = seedData as unknown as Game[];
  if (typeof window === 'undefined') {
    return seedList;
  }
  try {
    const stored = localStorage.getItem(GAMES_STORAGE_KEY) || localStorage.getItem('bg_share_games_v1');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge in images from seedList if missing
        const seedMap = new Map(seedList.map((g) => [g.title.toLowerCase(), g]));
        const merged = parsed.map((game: Game) => {
          if (!game.image || !game.thumbnail) {
            const seed = seedMap.get(game.title.toLowerCase());
            if (seed) {
              return {
                ...game,
                image: game.image || seed.image,
                thumbnail: game.thumbnail || seed.thumbnail,
                bggId: game.bggId || seed.bggId,
                bggRating: game.bggRating || seed.bggRating,
                bggRank: game.bggRank || seed.bggRank,
                weight: game.weight || seed.weight,
              };
            }
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
  // Fallback to seed data
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

export function getInitialRequests(): BorrowRequest[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read requests from localStorage:', err);
  }
  return [
    {
      id: 'req-sample-1',
      gameId: 'game-1',
      gameTitle: 'Harry Potter Stupefy',
      requesterName: 'Angel & Peter',
      holderName: 'Carissa & Brandon',
      requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: 'pending',
      note: 'Need it for game night this weekend!'
    }
  ];
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

export function getInitialFriends(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_FRIENDS;
  }
  try {
    const stored = localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read friends from localStorage:', err);
  }
  return DEFAULT_FRIENDS;
}

export function saveFriends(friends: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends));
    window.dispatchEvent(new Event('bg_friends_updated'));
  } catch (err) {
    console.error('Failed to save friends to localStorage:', err);
  }
}

export function getBggToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(BGG_TOKEN_KEY) || '';
}

export function saveBggToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BGG_TOKEN_KEY, token.trim());
}

export function resetToSeedData(): Game[] {
  if (typeof window === 'undefined') return seedData as unknown as Game[];
  localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(seedData));
  window.dispatchEvent(new Event('bg_games_updated'));
  return seedData as unknown as Game[];
}
