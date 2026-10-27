import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1wtXMkKkA1lq7rxSRAvux9T8vi1Kt8MZUzgsUrNSPWlE";
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = process.env.GOOGLE_PRIVATE_KEY;

console.log("=== GameShare Google Sheets Sync Test ===");
console.log(`Target Spreadsheet ID: ${spreadsheetId}`);
console.log(`Service Account Email: ${clientEmail || "(Not set in process.env)"}`);

if (!clientEmail || !privateKey) {
  console.log("\n⚠️ Service Account credentials not found in environment.");
  console.log("Testing public read fallback...");
  const tabs = ["Angel&Peter", "Kalissa&Allen", "Carissa&Brandon", "Celina&Stefan"];
  let totalGames = 0;
  for (const t of tabs) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(t)}`;
      const res = await fetch(url);
      const text = await res.text();
      const rows = text.split("\n").filter(Boolean);
      console.log(`✓ Tab [${t}]: ${rows.length - 1} games found.`);
      totalGames += Math.max(0, rows.length - 1);
    } catch (e) {
      console.error(`❌ Failed to read tab [${t}]:`, e.message);
    }
  }
  console.log(`\nTotal games accessible publicly: ${totalGames}`);
  console.log("\nTo enable 2-way write access (updating 'Borrowed by', adding games/tabs):");
  console.log("1. Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to Vercel and .env.local.");
  console.log(`2. Share the Google Sheet with that email as Editor.`);
  process.exit(0);
}

try {
  privateKey = privateKey.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title);
  console.log("\n✓ Google Sheets API Connection: SUCCESS!");
  console.log("Tabs in sheet:", titles);
  process.exit(0);
} catch (err) {
  console.error("\n❌ Google Sheets API Connection Error:", err.message);
  process.exit(1);
}
