import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, getDocs, limit, query } from "firebase/firestore";
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
  "Stefan & Celina"
];

function sanitizeForFirestore(data) {
  return JSON.parse(JSON.stringify(data, (_, v) => (v === undefined ? null : v)));
}

async function runSeed() {
  console.log(`Starting Firestore seed for ${seedGames.length} games to gameshare-d5fe0...`);
  try {
    const batch = writeBatch(db);
    for (const game of seedGames) {
      const gameRef = doc(db, "games", game.id);
      batch.set(gameRef, sanitizeForFirestore(game), { merge: true });
    }

    const rosterRef = doc(db, "settings", "household_roster");
    batch.set(rosterRef, { friends: defaultFriends, updatedAt: new Date().toISOString() });

    await batch.commit();
    console.log("✓ Successfully seeded all 126 games and households into Firestore!");

    const gamesCol = collection(db, "games");
    const snap = await getDocs(query(gamesCol, limit(5)));
    console.log(`✓ Verification: ${snap.size} sample games loaded back from Cloud Firestore:`);
    snap.forEach((d) => console.log(`   - [${d.id}] ${d.data().title} (Owner: ${d.data().owner})`));
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

runSeed();
