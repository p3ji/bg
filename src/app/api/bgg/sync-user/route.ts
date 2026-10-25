import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username')?.trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const targetUrl = `https://www.gdex.co.kr/api_bgg_sync.php?username=${encodeURIComponent(username)}`;
    
    // Attempt fetch with retry up to 3 times if BGG is preparing the collection
    let attempts = 0;
    const maxAttempts = 4;
    let data: any = null;

    while (attempts < maxAttempts) {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Upstream returned HTTP ${res.status}`);
      }

      data = await res.json();

      if (data.status === 'ready' || data.success && data.games) {
        break;
      }

      if (data.status === 'processing') {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2500));
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
    const formattedGames = (data.games || []).map((g: any, idx: number) => ({
      bggId: g.bgg_id,
      title: g.eng_title || g.title,
      year: g.year,
      minPlayers: Number(g.min_players) || 1,
      maxPlayers: Number(g.max_players) || 4,
      minPlaytime: Number(g.min_playtime) || 30,
      maxPlaytime: Number(g.max_playtime) || 60,
      playtimeDisplay: `${g.min_playtime || 30}-${g.max_playtime || 60} min`,
      type: g.subdomains?.strategygames ? 'Strategy' : (g.subdomains?.partygames ? 'Party' : 'Board Game'),
      bggRating: g.bgg_avg ? Number(g.bgg_avg.toFixed(1)) : null,
      bggRank: g.bgg_rank && g.bgg_rank > 0 ? g.bgg_rank : null,
      weight: g.bgg_weight ? Number(g.bgg_weight.toFixed(2)) : null,
      thumbnail: g.thumbnail || null,
      image: g.thumbnail || null,
    }));

    return NextResponse.json({
      success: true,
      username: data.username || username,
      totalGames: formattedGames.length,
      avatar: data.avatar,
      games: formattedGames
    });

  } catch (error: any) {
    console.error('BGG Sync error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to sync BGG collection' 
    }, { status: 500 });
  }
}
