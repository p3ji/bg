import { NextRequest, NextResponse } from 'next/server';
import seedData from '@/data/seedGames.json';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim().toLowerCase();
  const token = request.headers.get('x-bgg-token') || process.env.BGG_API_TOKEN;

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  // If token is provided, attempt official BGG XML API2
  if (token) {
    try {
      const bggRes = await fetch(
        `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'BoardGameShareApp/1.0',
          },
          next: { revalidate: 3600 }
        }
      );

      if (bggRes.ok) {
        const xmlText = await bggRes.text();
        // Parse basic items from XML
        const items: any[] = [];
        const itemRegex = /<item\s+type="boardgame"\s+id="(\d+)">([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xmlText)) !== null && items.length < 15) {
          const id = parseInt(match[1], 10);
          const body = match[2];
          const nameMatch = /<name\s+type="primary"\s+value="([^"]+)"\/>/.exec(body);
          const yearMatch = /<yearpublished\s+value="([^"]+)"\/>/.exec(body);

          if (nameMatch) {
            items.push({
              bggId: id,
              title: nameMatch[1],
              year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
              source: 'bgg_api'
            });
          }
        }

        if (items.length > 0) {
          return NextResponse.json({ results: items });
        }
      }
    } catch (err) {
      console.error('BGG XML API Search error:', err);
    }
  }

  // Fallback: search local curated database
  const matches = (seedData as any[])
    .filter((g) => g.title.toLowerCase().includes(query))
    .slice(0, 10)
    .map((g) => ({
      bggId: g.bggId || Math.floor(Math.random() * 1000000),
      title: g.title,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      minPlaytime: g.minPlaytime,
      maxPlaytime: g.maxPlaytime,
      type: g.type,
      bggRating: g.bggRating,
      bggRank: g.bggRank,
      weight: g.weight,
      image: g.image,
      thumbnail: g.thumbnail,
      source: 'local_database'
    }));

  return NextResponse.json({ results: matches });
}
