import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query, setDoc, doc, deleteDoc } from "firebase/firestore";

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

async function test() {
  console.log("Testing Firestore connection to gameshare-d5fe0...");
  const timer = setTimeout(() => {
    console.log("Timeout waiting for Firestore response.");
    process.exit(1);
  }, 6000);

  try {
    const testDocRef = doc(db, "_test_connection", "ping");
    await setDoc(testDocRef, { timestamp: new Date().toISOString(), status: "ok" });
    console.log("✓ Firestore Write: SUCCESS");
    await deleteDoc(testDocRef);
    console.log("✓ Firestore Delete: SUCCESS");

    const gamesCol = collection(db, "games");
    const snap = await getDocs(query(gamesCol, limit(5)));
    console.log(`✓ Firestore Read: SUCCESS (${snap.size} documents found)`);
    clearTimeout(timer);
    process.exit(0);
  } catch (err) {
    clearTimeout(timer);
    console.error("❌ Firestore connection status:", err.message);
    process.exit(1);
  }
}

test();
