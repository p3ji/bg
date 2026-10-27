import { NextRequest, NextResponse } from 'next/server';
import seedData from '@/data/seedGames.json';

async function searchWikidataForBggGames(query: string): Promise<any[]> {
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&type=item&language=en&format=json&limit=8`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'BoardGameShare/1.0 (https://github.com/p3ji/bg)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const searchItems: any[] = searchData.search || [];
    if (searchItems.length === 0) return [];

    // Filter candidate entities related to board games or games
    const entityIds = searchItems
      .filter((item: any) => {
        const desc = (item.description || '').toLowerCase();
        const label = (item.label || '').toLowerCase();
        return (
          desc.includes('game') ||
          desc.includes('board') ||
          desc.includes('card') ||
          desc.includes('tabletop') ||
          label.includes(query.toLowerCase())
        );
      })
      .map((item: any) => item.id)
      .slice(0, 5);

    if (entityIds.length === 0) return [];

    // Batch fetch P2339 (BGG ID)
    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityIds.join('|')}&props=claims|labels&format=json`;
    const entityRes = await fetch(entityUrl, {
      headers: {
        'User-Agent': 'BoardGameShare/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!entityRes.ok) return [];
    const entityData = await entityRes.json();
    const entities = entityData.entities || {};

    const bggIds: number[] = [];
    for (const id of entityIds) {
      const ent = entities[id];
      const p2339 = ent?.claims?.P2339;
      if (p2339 && p2339[0]?.mainsnak?.datavalue?.value) {
        const num = parseInt(p2339[0].mainsnak.datavalue.value, 10);
        if (!isNaN(num) && num > 0 && !bggIds.includes(num)) {
          bggIds.push(num);
        }
      }
    }

    if (bggIds.length === 0) return [];

    // Fetch details for each bggId from api.geekdo.com
    const results = await Promise.all(
      bggIds.slice(0, 3).map(async (bggId) => {
        try {
          const res = await fetch(`https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${bggId}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const item = data.item;
          if (!item) return null;
          const images = item.images || {};
          return {
            bggId,
            title: item.name,
            year: item.yearpublished ? parseInt(item.yearpublished, 10) : undefined,
            minPlayers: item.minplayers ? parseInt(item.minplayers, 10) : 2,
            maxPlayers: item.maxplayers ? parseInt(item.maxplayers, 10) : 4,
            minPlaytime: item.minplaytime ? parseInt(item.minplaytime, 10) : 30,
            maxPlaytime: item.maxplaytime ? parseInt(item.maxplaytime, 10) : 60,
            type: 'Board Game',
            image: images.original || item.imageurl || null,
            thumbnail: images.previewthumb || images.thumb || images.square200 || null,
            source: 'bgg_live',
          };
        } catch {
          return null;
        }
      })
    );

    return results.filter(Boolean);
  } catch (err) {
    console.error('Wikidata BGG search error:', err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get('q')?.trim();
  const token = request.headers.get('x-bgg-token') || process.env.BGG_API_TOKEN;

  if (!rawQuery) {
    return NextResponse.json({ results: [] });
  }

  const query = rawQuery.toLowerCase();

  // 1. Check if the user entered a direct BGG ID or BGG URL (e.g. "2083" or "https://boardgamegeek.com/boardgame/2083/checkers")
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

  // 2. Search local curated database
  const localMatches = (seedData as any[])
    .filter((g) => g.title.toLowerCase().includes(query) || (g.bggId && String(g.bggId).includes(query)))
    .slice(0, 10)
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

  // 3. Search online BGG / Wikidata catalog for any title not already in local database
  let liveResults: any[] = [];
  if (localMatches.length < 3) {
    liveResults = await searchWikidataForBggGames(rawQuery);
  }

  // Combine and deduplicate by bggId and title
  const combined = [...localMatches];
  const seenIds = new Set(localMatches.map((m) => m.bggId).filter(Boolean));
  const seenTitles = new Set(localMatches.map((m) => m.title.toLowerCase()));

  for (const live of liveResults) {
    if (live.bggId && seenIds.has(live.bggId)) continue;
    if (seenTitles.has(live.title.toLowerCase())) continue;
    combined.push(live);
    if (live.bggId) seenIds.add(live.bggId);
    seenTitles.add(live.title.toLowerCase());
  }

  return NextResponse.json({ results: combined });
}
