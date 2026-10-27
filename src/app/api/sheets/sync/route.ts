import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import {
  readAllGamesFromSheets,
  updateGameBorrowInSheets,
  updateGameDetailsInSheets,
  addGameToSheets,
  addGamesBatchToSheets,
  createHouseholdTabInSheets,
  getSpreadsheetId,
  getGoogleSheetsAuth,
} from '@/lib/googleSheets';

export async function GET() {
  try {
    await connection();

    const spreadsheetId = getSpreadsheetId();
    const auth = getGoogleSheetsAuth();
    const serviceAccountConfigured = Boolean(auth);

    const { households, games } = await readAllGamesFromSheets();

    return NextResponse.json({
      success: true,
      serviceAccountConfigured,
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
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read Google Sheets';
    console.error('Failed to sync with Google Sheets:', err);
    return NextResponse.json(
      {
        success: false,
        error: message,
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

    if (action === 'add_games_batch') {
      const { ownerHousehold, games } = body;
      if (!ownerHousehold || !Array.isArray(games)) {
        return NextResponse.json(
          { success: false, error: 'Missing ownerHousehold or games array' },
          { status: 400 }
        );
      }

      const res = await addGamesBatchToSheets(ownerHousehold, games);
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to execute Google Sheets action';
    console.error('Google Sheets POST action error:', err);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
