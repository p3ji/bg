import { google } from 'googleapis';
import { Game } from '@/types';
import { DEFAULT_FRIENDS } from '@/data/friends';
import { normalizeName, isSameHousehold, getCanonicalName } from './normalize';
import { matchesFuzzy } from './search';

export const DEFAULT_SHEET_ID = '1wtXMkKkA1lq7rxSRAvux9T8vi1Kt8MZUzgsUrNSPWlE';

export function getSpreadsheetId(): string {
  return process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
}

/**
 * Parses and returns a Google Auth JWT client using service account credentials.
 * Supports:
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY
 *  - GOOGLE_APPLICATION_CREDENTIALS_JSON (full JSON content)
 */
export function getGoogleSheetsAuth() {
  const jsonCreds =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (jsonCreds) {
    try {
      const parsed = typeof jsonCreds === 'string' ? JSON.parse(jsonCreds) : jsonCreds;
      return new google.auth.JWT({
        email: parsed.client_email,
        key: (parsed.private_key || '').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (err) {
      console.warn('Failed to parse Google credentials JSON:', err);
    }
  }

  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.SERVICE_ACCOUNT_EMAIL ||
    process.env.CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL;

  let privateKey =
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle escaped line breaks in environment variable
  privateKey = privateKey.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email: clientEmail.trim(),
    key: privateKey.trim(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export function isHouseholdTabName(title: string): boolean {
  const lower = title.toLowerCase().trim();
  if (lower.startsWith('template') || lower.includes('wishlist') || lower.includes('recommendation')) {
    return false;
  }
  return true;
}

export interface SheetRowGame {
  rowIndex: number; // 1-based row index in spreadsheet
  tabTitle: string;
  household: string;
  title: string;
  minPlayers: number;
  maxPlayers: number;
  type: string;
  playtime: number;
  playtimeDisplay: string;
  notes: string;
  borrowedBy: string | null;
}

/**
 * Reads all games across all household tabs in the spreadsheet
 */
export async function readAllGamesFromSheets(): Promise<{
  households: string[];
  games: SheetRowGame[];
  serviceAccountConfigured: boolean;
}> {
  const auth = getGoogleSheetsAuth();
  const spreadsheetId = getSpreadsheetId();

  // If Service Account is configured, use official Google Sheets API v4
  if (auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTabs = meta.data.sheets || [];

    const households: string[] = [];
    const allGames: SheetRowGame[] = [];

    for (const sheet of sheetTabs) {
      const title = sheet.properties?.title;
      if (!title || !isHouseholdTabName(title)) continue;

      const range = `${title}!A1:G`;
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      const rows = res.data.values || [];
      if (rows.length < 2) continue;

      const header0 = String(rows[0][0] || '').toLowerCase();
      if (!header0.includes('board game') && !header0.includes('name') && !header0.includes('title')) {
        continue;
      }

      // Convert tab title to clean canonical household name (e.g. "Angel&Peter" -> "Angel & Peter")
      const canonicalHousehold = getCanonicalName(title.replace(/&/g, ' & '));
      households.push(canonicalHousehold);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const gameTitle = String(row[0] || '').trim();
        if (!gameTitle) continue;

        const minP = parseInt(String(row[1] || '2'), 10) || 2;
        const maxP = parseInt(String(row[2] || '4'), 10) || Math.max(minP, 4);
        const gameType = String(row[3] || 'Strategy').trim();
        const playtimeStr = String(row[4] || '').trim();
        const playtime = parseInt(playtimeStr, 10) || 30;
        const notes = String(row[5] || '').trim();
        const rawBorrowedBy = String(row[6] || '').trim();
        const borrowedBy = rawBorrowedBy ? getCanonicalName(rawBorrowedBy) : null;

        allGames.push({
          rowIndex: i + 1, // 1-based index in sheet
          tabTitle: title,
          household: canonicalHousehold,
          title: gameTitle,
          minPlayers: minP,
          maxPlayers: maxP,
          type: gameType,
          playtime,
          playtimeDisplay: playtimeStr ? `${playtimeStr}m` : `${playtime}m`,
          notes,
          borrowedBy,
        });
      }
    }

    return { households, games: allGames, serviceAccountConfigured: true };
  }

  // Graceful fallback: Public gviz CSV export for known households if service account not yet provided
  const knownTabs = ['Angel&Peter', 'Kalissa&Allen', 'Carissa&Brandon', 'Celina&Stefan'];
  const households: string[] = [];
  const allGames: SheetRowGame[] = [];

  for (const tab of knownTabs) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const csv = await res.text();
      const lines = csv.split('\n').filter(Boolean);
      if (lines.length < 2) continue;

      const canonicalHousehold = getCanonicalName(tab.replace(/&/g, ' & '));
      households.push(canonicalHousehold);

      // Parse simple CSV line (respecting quotes)
      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        const gameTitle = (row[0] || '').trim();
        if (!gameTitle) continue;

        const minP = parseInt(row[1] || '2', 10) || 2;
        const maxP = parseInt(row[2] || '4', 10) || Math.max(minP, 4);
        const gameType = (row[3] || 'Strategy').trim();
        const playtimeStr = (row[4] || '').trim();
        const playtime = parseInt(playtimeStr, 10) || 30;
        const notes = (row[5] || '').trim();
        const rawBorrowedBy = (row[6] || '').trim();
        const borrowedBy = rawBorrowedBy ? getCanonicalName(rawBorrowedBy) : null;

        allGames.push({
          rowIndex: i + 1,
          tabTitle: tab,
          household: canonicalHousehold,
          title: gameTitle,
          minPlayers: minP,
          maxPlayers: maxP,
          type: gameType,
          playtime,
          playtimeDisplay: playtimeStr ? `${playtimeStr}m` : `${playtime}m`,
          notes,
          borrowedBy,
        });
      }
    } catch (err) {
      console.warn(`Failed to read fallback tab ${tab}:`, err);
    }
  }

  return { households, games: allGames, serviceAccountConfigured: false };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.replace(/^"|"$/g, '').trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.replace(/^"|"$/g, '').trim());
  return result;
}

/**
 * Updates Column G ("Borrowed by") for a specific game in the Google Sheet
 */
export async function updateGameBorrowInSheets(
  ownerHousehold: string,
  gameTitle: string,
  borrowerName: string | null
): Promise<{ success: boolean; message: string }> {
  const auth = getGoogleSheetsAuth();
  if (!auth) {
    return {
      success: false,
      message: 'Service Account credentials not configured in environment (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).',
    };
  }

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTabs = meta.data.sheets || [];

  // Find matching household tab
  let targetTabTitle: string | null = null;
  for (const sheet of sheetTabs) {
    const title = sheet.properties?.title;
    if (!title || !isHouseholdTabName(title)) continue;
    if (isSameHousehold(title.replace(/&/g, ' & '), ownerHousehold)) {
      targetTabTitle = title;
      break;
    }
  }

  if (!targetTabTitle) {
    return { success: false, message: `Could not find sheet tab for owner household: ${ownerHousehold}` };
  }

  // Fetch current rows in that tab
  const range = `${targetTabTitle}!A1:G`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];
  if (rows.length < 2) {
    return { success: false, message: `No game rows found in tab: ${targetTabTitle}` };
  }

  // Ensure Column G header is "Borrowed by"
  if (!rows[0][6] || rows[0][6] !== 'Borrowed by') {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${targetTabTitle}!G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Borrowed by']] },
    });
  }

  // Find game row index
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rowTitle = String(rows[i][0] || '').trim();
    if (matchesFuzzy(gameTitle, rowTitle) || normalizeName(gameTitle) === normalizeName(rowTitle)) {
      targetRowIndex = i + 1; // 1-based index in sheet
      break;
    }
  }

  if (targetRowIndex === -1) {
    return { success: false, message: `Game "${gameTitle}" not found in tab "${targetTabTitle}".` };
  }

  const valueToWrite = borrowerName ? borrowerName.trim() : '';

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${targetTabTitle}!G${targetRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[valueToWrite]],
    },
  });

  return {
    success: true,
    message: `Updated Google Sheets tab "${targetTabTitle}" row ${targetRowIndex} (Col G: "${valueToWrite}").`,
  };
}

/**
 * Updates an existing board game row's details (title, min/max players, type, playtime, notes) in Google Sheets
 */
export async function updateGameDetailsInSheets(
  ownerHousehold: string,
  previousGameTitle: string,
  updatedGame: Partial<Game>
): Promise<{ success: boolean; message: string }> {
  const auth = getGoogleSheetsAuth();
  if (!auth) {
    return {
      success: false,
      message: 'Service Account credentials not configured in environment.',
    };
  }

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTabs = meta.data.sheets || [];

  // 1. Find matching household tab
  let targetTabTitle: string | null = null;
  for (const sheet of sheetTabs) {
    const title = sheet.properties?.title;
    if (!title || !isHouseholdTabName(title)) continue;
    if (isSameHousehold(title.replace(/&/g, ' & '), ownerHousehold)) {
      targetTabTitle = title;
      break;
    }
  }

  if (!targetTabTitle) {
    return { success: false, message: `Could not find sheet tab for owner household: ${ownerHousehold}` };
  }

  // 2. Fetch current rows in that tab
  const range = `${targetTabTitle}!A1:G`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];
  if (rows.length < 2) {
    return { success: false, message: `No game rows found in tab: ${targetTabTitle}` };
  }

  // 3. Find matching row index
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rowTitle = String(rows[i][0] || '').trim();
    if (matchesFuzzy(previousGameTitle, rowTitle) || normalizeName(previousGameTitle) === normalizeName(rowTitle)) {
      targetRowIndex = i + 1; // 1-based index in sheet
      break;
    }
  }

  if (targetRowIndex === -1 && updatedGame.title) {
    for (let i = 1; i < rows.length; i++) {
      const rowTitle = String(rows[i][0] || '').trim();
      if (matchesFuzzy(updatedGame.title, rowTitle) || normalizeName(updatedGame.title) === normalizeName(rowTitle)) {
        targetRowIndex = i + 1;
        break;
      }
    }
  }

  if (targetRowIndex === -1) {
    return { success: false, message: `Game "${previousGameTitle}" not found in tab "${targetTabTitle}".` };
  }

  const existingRow = rows[targetRowIndex - 1] || [];
  const existingBorrowedBy = existingRow[6] || '';

  // Determine playtime representation: if min and max differ, e.g. "30-60", else single number
  let playtimeStr = '';
  if (updatedGame.minPlaytime && updatedGame.maxPlaytime && updatedGame.minPlaytime !== updatedGame.maxPlaytime) {
    playtimeStr = `${updatedGame.minPlaytime}-${updatedGame.maxPlaytime}`;
  } else if (updatedGame.minPlaytime || updatedGame.maxPlaytime) {
    playtimeStr = String(updatedGame.minPlaytime || updatedGame.maxPlaytime);
  } else {
    playtimeStr = existingRow[4] || '';
  }

  const newTitle = updatedGame.title !== undefined ? updatedGame.title : existingRow[0] || '';
  const newMin = updatedGame.minPlayers !== undefined ? updatedGame.minPlayers : existingRow[1] || '';
  const newMax = updatedGame.maxPlayers !== undefined ? updatedGame.maxPlayers : existingRow[2] || '';
  const newType = updatedGame.type !== undefined ? updatedGame.type : existingRow[3] || 'Strategy';
  const newNotes = updatedGame.notes !== undefined ? updatedGame.notes : existingRow[5] || '';
  const newBorrowedBy = updatedGame.currentBorrower !== undefined ? (updatedGame.currentBorrower || '') : existingBorrowedBy;

  // Check if owner changed to a different household tab
  if (updatedGame.owner && !isSameHousehold(updatedGame.owner, ownerHousehold)) {
    await addGameToSheets(updatedGame.owner, {
      ...updatedGame,
      title: newTitle,
      minPlayers: Number(newMin) || 1,
      maxPlayers: Number(newMax) || 4,
      type: newType,
      minPlaytime: Number(String(playtimeStr).split('-')[0]) || 30,
      notes: newNotes,
      currentBorrower: newBorrowedBy || null,
    });

    // Remove row from previous tab
    const targetSheetId = sheetTabs.find((s) => s.properties?.title === targetTabTitle)?.properties?.sheetId;
    if (targetSheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: targetSheetId,
                  dimension: 'ROWS',
                  startIndex: targetRowIndex - 1,
                  endIndex: targetRowIndex,
                },
              },
            },
          ],
        },
      });
    }

    return {
      success: true,
      message: `Moved game "${newTitle}" from "${targetTabTitle}" to "${updatedGame.owner}".`,
    };
  }

  // Update row in current tab
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${targetTabTitle}!A${targetRowIndex}:G${targetRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[newTitle, newMin, newMax, newType, playtimeStr, newNotes, newBorrowedBy]],
    },
  });

  return {
    success: true,
    message: `Updated Google Sheets tab "${targetTabTitle}" row ${targetRowIndex} for "${newTitle}".`,
  };
}

/**
 * Appends a new board game row to an owner household's tab in Google Sheets
 */
export async function addGameToSheets(
  ownerHousehold: string,
  game: Partial<Game>
): Promise<{ success: boolean; message: string }> {
  const auth = getGoogleSheetsAuth();
  if (!auth) {
    return { success: false, message: 'Service Account not configured.' };
  }

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTabs = meta.data.sheets || [];

  let targetTabTitle: string | null = null;
  for (const sheet of sheetTabs) {
    const title = sheet.properties?.title;
    if (!title || !isHouseholdTabName(title)) continue;
    if (isSameHousehold(title.replace(/&/g, ' & '), ownerHousehold)) {
      targetTabTitle = title;
      break;
    }
  }

  if (!targetTabTitle) {
    // If tab doesn't exist, create it first
    await createHouseholdTabInSheets(ownerHousehold);
    targetTabTitle = ownerHousehold;
  }

  const newRow = [
    game.title || '',
    game.minPlayers || '',
    game.maxPlayers || '',
    game.type || 'Strategy',
    game.minPlaytime || '',
    game.notes || '',
    game.currentBorrower || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${targetTabTitle}!A:G`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [newRow],
    },
  });

  return { success: true, message: `Added "${game.title}" to tab "${targetTabTitle}".` };
}

/**
 * Creates a new household tab in Google Sheets modeled after Template
 */
export async function createHouseholdTabInSheets(
  householdName: string
): Promise<{ success: boolean; message: string }> {
  const auth = getGoogleSheetsAuth();
  if (!auth) {
    return { success: false, message: 'Service Account not configured.' };
  }

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTabs = meta.data.sheets || [];

  // Check if tab already exists
  for (const sheet of sheetTabs) {
    const title = sheet.properties?.title;
    if (title && isSameHousehold(title.replace(/&/g, ' & '), householdName)) {
      return { success: true, message: `Tab "${title}" already exists.` };
    }
  }

  // Find "Template " tab if available
  const templateSheet = sheetTabs.find((s) => s.properties?.title?.toLowerCase().includes('template'));

  const cleanTabName = householdName.includes('&') ? householdName.replace(/\s*&\s*/g, '&') : householdName;

  if (templateSheet && templateSheet.properties?.sheetId !== undefined) {
    // Duplicate template sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: templateSheet.properties.sheetId,
              newSheetName: cleanTabName,
            },
          },
        ],
      },
    });
  } else {
    // Create new sheet with headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: cleanTabName,
              },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${cleanTabName}!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'Board Game Name',
            'Minimum # of Players',
            'Maximum # of Players',
            'Type',
            'Play Time (minutes)',
            'Notes',
            'Borrowed by',
          ],
        ],
      },
    });
  }

  return { success: true, message: `Created new tab "${cleanTabName}" in Google Sheets.` };
}
