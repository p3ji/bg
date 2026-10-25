import { NextRequest, NextResponse } from 'next/server';
import seedData from '@/data/seedGames.json';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get('q')?.trim();
  const token = request.headers.get('x-bgg-token') || process.env.BGG_API_TOKEN;

  if (!rawQuery) {
    return NextResponse.json({ results: [] });
  }

  const query = rawQuery.toLowerCase();

  // 1. Check if the user entered a direct BGG ID or BGG URL (e.g. "148228" or "https://boardgamegeek.com/boardgame/148228/splendor")
  const idMatch = rawQuery.match(/(?:boardgame\/|^)(\d+)(?:\/|$)/);
  if (idMatch && idMatch[1]) {
    const directId = parseInt(idMatch[1], 10);
    try {
      const bggRes = await fetch(`https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${directId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 86400 },
      });

      if (bggRes.ok) {
        const data = await bggRes.json();
        const item = data.item;
        if (item) {
          const images = item.images || {};
          return NextResponse.json({
            results: [
              {
                bggId: directId,
                title: item.name,
                year: item.yearpublished ? parseInt(item.yearpublished, 10) : undefined,
                minPlayers: item.minplayers ? parseInt(item.minplayers, 10) : 1,
                maxPlayers: item.maxplayers ? parseInt(item.maxplayers, 10) : 4,
                minPlaytime: item.minplaytime ? parseInt(item.minplaytime, 10) : 30,
                maxPlaytime: item.maxplaytime ? parseInt(item.maxplaytime, 10) : 60,
                image: images.original || item.imageurl || null,
                thumbnail: images.previewthumb || images.thumb || images.square200 || null,
                source: 'bgg_direct_id',
              },
            ],
          });
        }
      }
    } catch (err) {
      console.error('Direct BGG ID lookup error:', err);
    }
  }

  // 2. If token is provided, attempt official BGG XML API2
  if (token) {
    try {
      const bggRes = await fetch(
        `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'BoardGameShareApp/1.0',
          },
          next: { revalidate: 3600 },
        }
      );

      if (bggRes.ok) {
        const xmlText = await bggRes.text();
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
              source: 'bgg_api',
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

  // 3. Search local curated database (now rich with verified BGG IDs and official covers)
  const matches = (seedData as any[])
    .filter((g) => g.title.toLowerCase().includes(query) || (g.bggId && String(g.bggId).includes(query)))
    .slice(0, 15)
    .map((g) => ({
      bggId: g.bggId,
      title: g.title,
      year: g.year,
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
      source: 'local_database',
    }));

  return NextResponse.json({ results: matches });
}
