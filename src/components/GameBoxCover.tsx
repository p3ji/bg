'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface GameBoxCoverProps {
  title: string;
  image?: string | null;
  thumbnail?: string | null;
  type?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playtimeDisplay?: string;
  className?: string;
  fullBleedCard?: boolean;
}

export const GameBoxCover: React.FC<GameBoxCoverProps> = ({
  title,
  image,
  thumbnail,
  type = 'Board Game',
  minPlayers = 2,
  maxPlayers = 4,
  playtimeDisplay = '45 min',
  className = '',
  fullBleedCard = false,
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [proxySrc, setProxySrc] = useState<string | null>(null);

  const rawSrc = image || thumbnail || null;
  const triedProxy = Boolean(rawSrc && proxySrc === rawSrc);
  const hasError = Boolean(rawSrc && failedSrc === rawSrc);
  
  // Choose source: raw first, then proxy if raw fails
  let activeSrc: string | null = null;
  if (!hasError && rawSrc) {
    if (triedProxy) {
      // If direct failed and it's an external http(s) URL, use our server proxy
      if (rawSrc.startsWith('http')) {
        activeSrc = `/api/image-proxy?url=${encodeURIComponent(rawSrc)}`;
      } else {
        activeSrc = rawSrc;
      }
    } else {
      activeSrc = rawSrc;
    }
  }

  const handleImageError = () => {
    if (!triedProxy && rawSrc && rawSrc.startsWith('http')) {
      // Try again through the internal proxy before giving up
      setProxySrc(rawSrc);
    } else if (rawSrc) {
      setFailedSrc(rawSrc);
    }
  };

  // Generate deterministic subtle color theme based on type
  const getThemeColors = (gameType: string) => {
    const t = (gameType || '').toLowerCase();
    if (t.includes('strategy')) {
      return {
        bg: 'from-emerald-950 via-teal-900 to-slate-950',
        accent: 'text-emerald-400 border-emerald-700/50',
        badge: 'bg-emerald-900/80 text-emerald-200 border-emerald-700/60',
      };
    }
    if (t.includes('party')) {
      return {
        bg: 'from-amber-950 via-rose-900 to-stone-950',
        accent: 'text-amber-400 border-amber-700/50',
        badge: 'bg-amber-900/80 text-amber-200 border-amber-700/60',
      };
    }
    if (t.includes('cooperative') || t.includes('co-op')) {
      return {
        bg: 'from-sky-950 via-blue-900 to-slate-950',
        accent: 'text-sky-400 border-sky-700/50',
        badge: 'bg-sky-900/80 text-sky-200 border-sky-700/60',
      };
    }
    if (t.includes('two-player') || t.includes('duel')) {
      return {
        bg: 'from-purple-950 via-indigo-900 to-slate-950',
        accent: 'text-purple-400 border-purple-700/50',
        badge: 'bg-purple-900/80 text-purple-200 border-purple-700/60',
      };
    }
    return {
      bg: 'from-slate-900 via-zinc-800 to-stone-950',
      accent: 'text-slate-300 border-slate-700/50',
      badge: 'bg-slate-800/80 text-slate-200 border-slate-700/60',
    };
  };

  const theme = getThemeColors(type);

  if (activeSrc) {
    return (
      <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
        <Image
          src={activeSrc}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
          unoptimized
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      </div>
    );
  }

  // Elegant stylized box cover fallback
  if (fullBleedCard) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} p-4 flex flex-col items-center justify-center select-none ${className}`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center px-2 -mt-4">
          <span className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border mb-2 ${theme.badge}`}>
            {type}
          </span>
          <h3 className="text-white font-extrabold text-base sm:text-lg leading-snug line-clamp-3 tracking-tight drop-shadow-md">
            {title}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} p-4 flex flex-col justify-between border border-white/10 select-none ${className}`}
    >
      {/* Box texture pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
      
      {/* Top subtle category pill */}
      <div className="relative z-10 flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${theme.badge}`}>
          {type}
        </span>
      </div>

      {/* Center Game Title */}
      <div className="relative z-10 my-auto py-2">
        <h3 className="text-white font-bold text-base leading-snug line-clamp-3 text-center tracking-tight drop-shadow-sm">
          {title}
        </h3>
      </div>

      {/* Bottom stats row */}
      <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-300">
        <span className="font-medium">
          {minPlayers === maxPlayers ? `${minPlayers}p` : `${minPlayers}–${maxPlayers}p`}
        </span>
        <span className="text-zinc-400 font-mono text-[10px]">
          {playtimeDisplay}
        </span>
      </div>
    </div>
  );
};
