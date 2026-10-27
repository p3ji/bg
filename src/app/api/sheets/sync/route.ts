import { NextRequest, NextResponse } from 'next/server';
import {
  readAllGamesFromSheets,
  updateGameBorrowInSheets,
  updateGameDetailsInSheets,
  addGameToSheets,
  createHouseholdTabInSheets,
  getSpreadsheetId,
  getGoogleSheetsAuth,
} from '@/lib/googleSheets';

export async function GET() {
  try {
    const spreadsheetId = getSpreadsheetId();
    const auth = getGoogleSheetsAuth();
    const serviceAccountConfigured = Boolean(auth);

    const { households, games } = await readAllGamesFromSheets();

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;

    return NextResponse.json({
      success: true,
      serviceAccountConfigured,
      clientEmail,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      households,
      totalGames: games.length,
      games,
      setupHelp: !serviceAccountConfigured
        ? {
            status: 'Service Account not yet configured in environment variables.',
            requiredEnvVars: ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'],
            actionNeeded: 'Add your service account credentials to Vercel and share the spreadsheet with the service account email as Editor.',
          }
        : null,
    });
  } catch (err: any) {
    console.error('Failed to sync with Google Sheets:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to read Google Sheets',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action parameter' }, { status: 400 });
    }

    if (action === 'update_borrow') {
      const { ownerHousehold, gameTitle, borrowerName } = body;
      if (!ownerHousehold || !gameTitle) {
        return NextResponse.json(
          { success: false, error: 'Missing ownerHousehold or gameTitle' },
          { status: 400 }
        );
      }

      const res = await updateGameBorrowInSheets(ownerHousehold, gameTitle, borrowerName || null);
      return NextResponse.json(res);
    }

    if (action === 'update_game_details') {
      const { previousOwnerHousehold, previousGameTitle, updatedGame } = body;
      if (!previousOwnerHousehold || !previousGameTitle || !updatedGame) {
        return NextResponse.json(
          { success: false, error: 'Missing previousOwnerHousehold, previousGameTitle, or updatedGame' },
          { status: 400 }
        );
      }

      const res = await updateGameDetailsInSheets(previousOwnerHousehold, previousGameTitle, updatedGame);
      return NextResponse.json(res);
    }

    if (action === 'add_game') {
      const { ownerHousehold, game } = body;
      if (!ownerHousehold || !game?.title) {
        return NextResponse.json(
          { success: false, error: 'Missing ownerHousehold or game data' },
          { status: 400 }
        );
      }

      const res = await addGameToSheets(ownerHousehold, game);
      return NextResponse.json(res);
    }

    if (action === 'add_household') {
      const { householdName } = body;
      if (!householdName) {
        return NextResponse.json(
          { success: false, error: 'Missing householdName parameter' },
          { status: 400 }
        );
      }

      const res = await createHouseholdTabInSheets(householdName);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Google Sheets POST action error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to execute Google Sheets action',
      },
      { status: 500 }
    );
  }
}
