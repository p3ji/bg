import { NextRequest, NextResponse } from 'next/server';

interface UpstreamBggGame {
  bgg_id?: number;
  eng_title?: string;
  title?: string;
  year?: number;
  min_players?: number | string;
  max_players?: number | string;
  min_playtime?: number | string;
  max_playtime?: number | string;
  subdomains?: {
    strategygames?: boolean;
    partygames?: boolean;
  };
  bgg_avg?: number;
  bgg_rank?: number;
  bgg_weight?: number;
  thumbnail?: string;
}

interface UpstreamBggSyncResponse {
  status?: string;
  success?: boolean;
  message?: string;
  username?: string;
  avatar?: string;
  games?: UpstreamBggGame[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username')?.trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const targetUrl = `https://www.gdex.co.kr/api_bgg_sync.php?username=${encodeURIComponent(username)}`;
    
    // Attempt fetch with retry up to 2 times if BGG is preparing the collection
    let attempts = 0;
    const maxAttempts = 2;
    let data: UpstreamBggSyncResponse | null = null;

    while (attempts < maxAttempts) {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(4500),
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Upstream returned HTTP ${res.status}`);
      }

      data = (await res.json()) as UpstreamBggSyncResponse;

      if (data.status === 'ready' || (data.success && Array.isArray(data.games))) {
        break;
      }

      if (data.status === 'processing') {
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } else {
        break;
      }
    }

    if (!data || (!data.games && !data.success)) {
      return NextResponse.json({ 
        error: data?.message || 'Collection not ready yet. Please try again in a few moments.' 
      }, { status: 202 });
    }

    // Format games into our clean schema
    const formattedGames = (data.games || []).map((g: UpstreamBggGame) => {
      const minPlayers = Number(g.min_players) || 1;
      const maxPlayers = Math.max(minPlayers, Number(g.max_players) || minPlayers);
      const minPlaytime = Number(g.min_playtime) || 30;
      const maxPlaytime = Math.max(minPlaytime, Number(g.max_playtime) || minPlaytime);
      return {
        bggId: g.bgg_id,
        title: g.eng_title || g.title,
        year: g.year,
        minPlayers,
        maxPlayers,
        minPlaytime,
        maxPlaytime,
        playtimeDisplay: minPlaytime === maxPlaytime ? `${minPlaytime}m` : `${minPlaytime}-${maxPlaytime}m`,
        type: g.subdomains?.strategygames ? 'Strategy' : (g.subdomains?.partygames ? 'Party' : 'Board Game'),
        bggRating: g.bgg_avg ? Number(g.bgg_avg.toFixed(1)) : null,
        bggRank: g.bgg_rank && g.bgg_rank > 0 ? g.bgg_rank : null,
        weight: g.bgg_weight ? Number(g.bgg_weight.toFixed(2)) : null,
        thumbnail: g.thumbnail || null,
        image: g.thumbnail || null,
      };
    });

    if (formattedGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No games found for BGG user '${username}'. Make sure games are marked as 'Owned' in your collection on BoardGameGeek.com, or use the 'Search & Add' tab to look up and add games individually.`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      username: data.username || username,
      totalGames: formattedGames.length,
      avatar: data.avatar,
      games: formattedGames
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync BGG collection';
    console.error('BGG Sync error:', error);
    return NextResponse.json({ 
      error: message
    }, { status: 500 });
  }
}
