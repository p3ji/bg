import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const idStr = searchParams.get('id')?.trim();

  if (!idStr) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const bggId = parseInt(idStr, 10);
  if (isNaN(bggId) || bggId <= 0) {
    return NextResponse.json({ error: 'Invalid BGG ID' }, { status: 400 });
  }

  try {
    const url = `https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${bggId}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }, // Cache 24 hours
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `BoardGameGeek returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const item = data.item;

    if (!item) {
      return NextResponse.json({ error: 'Board game not found on BGG' }, { status: 404 });
    }

    const images = item.images || {};
    const originalImage = images.original || item.imageurl || null;
    const thumbnail = images.previewthumb || images.thumb || images.square200 || item.imageurl || null;

    const minPlayers = item.minplayers ? parseInt(item.minplayers, 10) : 1;
    const maxPlayers = item.maxplayers ? parseInt(item.maxplayers, 10) : 4;
    const minPlaytime = item.minplaytime ? parseInt(item.minplaytime, 10) : 30;
    const maxPlaytime = item.maxplaytime ? parseInt(item.maxplaytime, 10) : 60;
    const year = item.yearpublished ? parseInt(item.yearpublished, 10) : undefined;

    return NextResponse.json({
      success: true,
      bggId,
      title: item.name,
      year,
      minPlayers,
      maxPlayers,
      minPlaytime,
      maxPlaytime,
      image: originalImage,
      thumbnail,
      description: item.short_description || item.description || '',
    });
  } catch (err: any) {
    console.error('BGG Lookup error:', err);
    return NextResponse.json({ error: 'Failed to look up game on BGG', details: err.message }, { status: 500 });
  }
}
