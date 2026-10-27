import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs,
  query,
  limit,
  Firestore
} from 'firebase/firestore';
import { Game, BorrowRequest } from '@/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA7_8foS0xla3ws795dPkbSUhYG5gaBNXo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gameshare-d5fe0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gameshare-d5fe0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gameshare-d5fe0.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "855770139075",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:855770139075:web:b6e33b94016f3f14369576",
  measurementId: "G-262R3RK5CR"
};

// Safe singleton Firebase initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);

export const COLLECTIONS = {
  GAMES: 'games',
  REQUESTS: 'borrow_requests',
  SETTINGS: 'settings',
};

// Clean helper: Firestore rejects undefined values in object fields
function sanitizeForFirestore<T>(data: T): Record<string, unknown> {
  const json = JSON.stringify(data, (_, v) => (v === undefined ? null : v));
  return JSON.parse(json);
}

/**
 * Clamps and normalizes a Game object so it strictly satisfies firestore.rules bounds
 * even if legacy localStorage or external sheet imports contain out-of-range numbers.
 */
function clampGameForFirestore(game: Game): Record<string, unknown> {
  const minPlayers = Math.min(100, Math.max(0, Number.isFinite(game.minPlayers) ? Math.round(game.minPlayers) : 1));
  const maxPlayers = Math.min(100, Math.max(minPlayers, Number.isFinite(game.maxPlayers) ? Math.round(game.maxPlayers) : minPlayers));

  let rawMinPlay = Number.isFinite(game.minPlaytime) ? Math.round(game.minPlaytime) : 30;
  let rawMaxPlay = Number.isFinite(game.maxPlaytime) ? Math.round(game.maxPlaytime) : rawMinPlay;
  // Guard against Excel date serial numbers (> 10000)
  if (rawMinPlay > 10000) rawMinPlay = 30;
  if (rawMaxPlay > 10000) rawMaxPlay = rawMinPlay;
  const minPlaytime = Math.min(10000, Math.max(0, rawMinPlay));
  const maxPlaytime = Math.min(10000, Math.max(minPlaytime, rawMaxPlay));

  const weight =
    typeof game.weight === 'number' && Number.isFinite(game.weight)
      ? Math.min(5, Math.max(0, Number(game.weight)))
      : null;
  const bggRating =
    typeof game.bggRating === 'number' && Number.isFinite(game.bggRating)
      ? Math.min(10, Math.max(0, Number(game.bggRating)))
      : null;
  const bggRank =
    typeof game.bggRank === 'number' && Number.isFinite(game.bggRank) && game.bggRank >= 0 && game.bggRank <= 100000000
      ? Math.round(game.bggRank)
      : null;
  const bggId =
    typeof game.bggId === 'number' && Number.isFinite(game.bggId) && game.bggId >= 0 && game.bggId <= 100000000
      ? Math.round(game.bggId)
      : null;
  const year =
    typeof game.year === 'number' && Number.isFinite(game.year) && game.year >= -5000 && game.year <= 3000
      ? Math.round(game.year)
      : null;

  const clamped: Game = {
    id: String(game.id || '').slice(0, 100),
    title: String(game.title || 'Untitled').slice(0, 200),
    owner: String(game.owner || 'Unknown').slice(0, 100),
    minPlayers,
    maxPlayers,
    minPlaytime,
    maxPlaytime,
    playtimeDisplay: String(game.playtimeDisplay || `${minPlaytime}m`).slice(0, 100),
    type: String(game.type || 'Strategy').slice(0, 100),
    status: game.status === 'borrowed' ? 'borrowed' : 'available',
    currentBorrower: game.currentBorrower ? String(game.currentBorrower).slice(0, 100) : null,
    borrowDate: game.borrowDate ? String(game.borrowDate).slice(0, 100) : null,
    expectedReturnDate: game.expectedReturnDate ? String(game.expectedReturnDate).slice(0, 100) : null,
    bggId,
    bggRating,
    bggRank,
    weight,
    image: game.image ? String(game.image).slice(0, 2000) : null,
    thumbnail: game.thumbnail ? String(game.thumbnail).slice(0, 2000) : null,
    description: game.description ? String(game.description).slice(0, 10000) : null,
    year,
    notes: typeof game.notes === 'string' ? game.notes.slice(0, 2000) : '',
    history: Array.isArray(game.history) ? game.history.slice(-200) : [],
    borrowRequests: Array.isArray(game.borrowRequests) ? game.borrowRequests.slice(-200) : [],
  };

  return sanitizeForFirestore(clamped);
}

/**
 * Real-time listener for the shared games catalog across all friends
 */
export function subscribeToCloudGames(callback: (games: Game[]) => void): () => void {
  const gamesCol = collection(db, COLLECTIONS.GAMES);
  return onSnapshot(
    gamesCol,
    (snapshot) => {
      const items: Game[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Game);
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore games subscription notice (falling back to local cache):', err);
    }
  );
}

/**
 * Real-time listener for shared borrow exchange requests
 */
export function subscribeToCloudRequests(callback: (requests: BorrowRequest[]) => void): () => void {
  const reqCol = collection(db, COLLECTIONS.REQUESTS);
  return onSnapshot(
    reqCol,
    (snapshot) => {
      const items: BorrowRequest[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as BorrowRequest);
      });
      // Sort newest requests first
      items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Firestore requests subscription notice (falling back to local cache):', err);
    }
  );
}

/**
 * Real-time listener for friend household roster
 */
export function subscribeToCloudHouseholds(callback: (friends: string[]) => void): () => void {
  const rosterDoc = doc(db, COLLECTIONS.SETTINGS, 'household_roster');
  return onSnapshot(
    rosterDoc,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.friends) && data.friends.length > 0) {
          callback(data.friends);
        }
      }
    },
    (err) => {
      console.warn('Firestore households subscription notice:', err);
    }
  );
}

/**
 * Save or update a single game in Cloud Firestore
 */
export async function saveGameToCloud(game: Game): Promise<void> {
  try {
    const gameDoc = doc(db, COLLECTIONS.GAMES, game.id);
    await setDoc(gameDoc, clampGameForFirestore(game), { merge: true });
  } catch (err) {
    console.error('Failed to save game to Firestore:', err);
  }
}

/**
 * Batch save games (e.g. during initial seed or bulk import)
 */
export async function saveGamesBatchToCloud(games: Game[]): Promise<void> {
  try {
    // Firestore batches are limited to 500 writes
    const CHUNK_SIZE = 400;
    for (let i = 0; i < games.length; i += CHUNK_SIZE) {
      const chunk = games.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const game of chunk) {
        const gameDoc = doc(db, COLLECTIONS.GAMES, game.id);
        batch.set(gameDoc, clampGameForFirestore(game), { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to batch save games to Firestore:', err);
  }
}

/**
 * Clamps and normalizes a BorrowRequest object so it strictly satisfies firestore.rules bounds.
 */
function clampRequestForFirestore(req: BorrowRequest): Record<string, unknown> {
  const validStatuses: BorrowRequest['status'][] = ['pending', 'accepted', 'fulfilled', 'cancelled'];
  const status: BorrowRequest['status'] = validStatuses.includes(req.status) ? req.status : 'pending';

  const clamped: BorrowRequest = {
    id: String(req.id || '').slice(0, 100),
    gameId: String(req.gameId || '').slice(0, 100),
    gameTitle: String(req.gameTitle || 'Untitled').slice(0, 200),
    requesterName: String(req.requesterName || 'Unknown').slice(0, 100),
    holderName: String(req.holderName || 'Unknown').slice(0, 100),
    requestedAt: String(req.requestedAt || new Date().toISOString()).slice(0, 100),
    status,
    acceptedAt: req.acceptedAt ? String(req.acceptedAt).slice(0, 100) : undefined,
    confirmedAt: req.confirmedAt ? String(req.confirmedAt).slice(0, 100) : undefined,
    note: typeof req.note === 'string' ? req.note.slice(0, 1000) : undefined,
    expectedReturnDate: req.expectedReturnDate ? String(req.expectedReturnDate).slice(0, 100) : undefined,
  };

  return sanitizeForFirestore(clamped);
}

/**
 * Save or update a borrow request in Cloud Firestore
 */
export async function saveRequestToCloud(req: BorrowRequest): Promise<void> {
  try {
    const reqDoc = doc(db, COLLECTIONS.REQUESTS, req.id);
    await setDoc(reqDoc, clampRequestForFirestore(req), { merge: true });
  } catch (err) {
    console.error('Failed to save request to Firestore:', err);
  }
}

/**
 * Delete a borrow request from Cloud Firestore
 */
export async function deleteRequestFromCloud(requestId: string): Promise<void> {
  try {
    const reqDoc = doc(db, COLLECTIONS.REQUESTS, requestId);
    await deleteDoc(reqDoc);
  } catch (err) {
    console.error('Failed to delete request from Firestore:', err);
  }
}

/**
 * Save household roster to Cloud Firestore
 */
export async function saveHouseholdsToCloud(friends: string[]): Promise<void> {
  try {
    const rosterDoc = doc(db, COLLECTIONS.SETTINGS, 'household_roster');
    await setDoc(rosterDoc, { friends, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Failed to save households to Firestore:', err);
  }
}

/**
 * Auto-seeds Firestore with the initial 126 games if the database collection is empty
 */
export async function seedCloudDatabaseIfNeeded(seedGames: Game[], defaultFriends: string[]): Promise<boolean> {
  try {
    const gamesCol = collection(db, COLLECTIONS.GAMES);
    const q = query(gamesCol, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Firestore is empty. Auto-seeding initial 126 board games to cloud...');
      await saveGamesBatchToCloud(seedGames);
      await saveHouseholdsToCloud(defaultFriends);
      console.log('Successfully seeded Firestore library!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Auto-seed check notice (check Firestore rules if permission denied):', err);
    return false;
  }
}
