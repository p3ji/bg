import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, getDocs, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyA7_8foS0xla3ws795dPkbSUhYG5gaBNXo",
  authDomain: "gameshare-d5fe0.firebaseapp.com",
  projectId: "gameshare-d5fe0",
  storageBucket: "gameshare-d5fe0.firebasestorage.app",
  messagingSenderId: "855770139075",
  appId: "1:855770139075:web:b6e33b94016f3f14369576",
  measurementId: "G-262R3RK5CR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedGames = JSON.parse(fs.readFileSync(path.resolve("src/data/seedGames.json"), "utf8"));
const defaultFriends = [
  "Angel & Peter",
  "Kalissa & Allen",
  "Carissa & Brandon",
  "Celina & Stefan"
];

function sanitizeForFirestore(data) {
  return JSON.parse(JSON.stringify(data, (_, v) => (v === undefined ? null : v)));
}

async function resetAll() {
  console.log("1. Deleting all active borrow requests in Firestore...");
  const reqSnap = await getDocs(collection(db, "borrow_requests"));
  console.log(`Found ${reqSnap.size} borrow_requests to delete.`);
  for (const d of reqSnap.docs) {
    await deleteDoc(d.ref);
  }
  console.log("✓ Cleared all borrow requests.");

  console.log("2. Resetting all 126 games back to original seed data...");
  // Use chunks of 100 for batches
  const chunkSize = 100;
  for (let i = 0; i < seedGames.length; i += chunkSize) {
    const chunk = seedGames.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const game of chunk) {
      const gameRef = doc(db, "games", game.id);
      const cleanGame = {
        ...game,
        status: game.status || "available",
        currentBorrower: game.currentBorrower || null,
        borrowDate: game.borrowDate || null,
        expectedReturnDate: game.expectedReturnDate || null,
        history: game.history || [],
        borrowRequests: [],
        notes: game.notes || "",
      };
      batch.set(gameRef, sanitizeForFirestore(cleanGame));
    }
    await batch.commit();
    console.log(`✓ Committed batch of ${chunk.length} games (total processed: ${i + chunk.length})`);
  }

  console.log("3. Resetting household roster...");
  const rosterBatch = writeBatch(db);
  const rosterRef = doc(db, "settings", "household_roster");
  rosterBatch.set(rosterRef, { friends: defaultFriends, updatedAt: new Date().toISOString() });
  await rosterBatch.commit();
  console.log("✓ Household roster reset.");

  console.log("4. Verifying reset in Firestore...");
  const verifyGames = await getDocs(collection(db, "games"));
  const verifyReqs = await getDocs(collection(db, "borrow_requests"));
  const borrowedGames = [];
  verifyGames.forEach(d => {
    const g = d.data();
    if (g.status === "borrowed" || g.currentBorrower) {
      borrowedGames.push({ title: g.title, owner: g.owner, borrower: g.currentBorrower });
    }
  });

  console.log(`✓ Games count: ${verifyGames.size}`);
  console.log(`✓ Requests count: ${verifyReqs.size} (should be 0)`);
  console.log(`✓ Borrowed games:`, borrowedGames);
  console.log("🎉 Reset to original Excel data completed successfully!");
  process.exit(0);
}

resetAll().catch(err => {
  console.error("Reset failed:", err);
  process.exit(1);
});
