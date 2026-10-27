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
    await setDoc(gameDoc, sanitizeForFirestore(game), { merge: true });
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
        batch.set(gameDoc, sanitizeForFirestore(game), { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to batch save games to Firestore:', err);
  }
}

/**
 * Save or update a borrow request in Cloud Firestore
 */
export async function saveRequestToCloud(req: BorrowRequest): Promise<void> {
  try {
    const reqDoc = doc(db, COLLECTIONS.REQUESTS, req.id);
    await setDoc(reqDoc, sanitizeForFirestore(req), { merge: true });
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
