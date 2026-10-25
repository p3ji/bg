# GameShare • Friend Board Game Library & Lending Tracker

A clean, utilitarian web app for tracking and sharing board game collections among friends, with full BoardGameGeek (BGG) integration, live loan tracking, and dual browsing views.

## Features

- **Preloaded Collection**: 126 games preloaded directly from your friend circle inventory spreadsheet across four households:
  - **Angel & Peter** (~66 games)
  - **Kalissa & Allen** (~30 games)
  - **Carissa & Brandon** (~31 games)
  - **Celina & Stefan** (~11 games)
- **Dual Browsing Views**:
  - **Bookshelf / Cover Grid**: Netflix/shelf-style cards with box art, live availability pills, player counts, and playtime badges.
  - **Coverless Dense Table**: Clean, high-density tabular view for rapid scanning without artwork.
- **BoardGameGeek Integration**:
  - Sync collection directly from any BGG username (batch import with box art, community ratings, rank, and complexity weight).
  - Search BGG by game title to add individual titles with 1 click.
  - Optional support for registered BGG API Bearer tokens.
- **Borrowing & Lending Management**:
  - Low-friction friend roster: Pick your name from a dropdown or type a name to borrow.
  - Record borrow dates, optional target return dates, and notes.
  - Full loan history timeline for each game.
- **Request Borrow & 1-Click Pings**:
  - Request games that are currently on loan.
  - Dynamic in-app notification badge on the bell icon and browser tab.
  - 1-click **WhatsApp**, **iMessage / SMS**, or **Copy link** nudge messages to ping the current holder.
- **Rich Filters & Sorting**:
  - Filter by exact player count (1p, 2p, 3p, 4p, 5p, 6p+).
  - Filter by max playtime (≤ 30m, 45m, 60m, 90m, 120m).
  - Filter by availability (*Available Now* vs. *Loaned*).
  - Filter by owner household or game type/category.
  - Sort by BGG Rank, BGG Rating, Title (A–Z), Playtime, or Complexity Weight.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel / Cloudflare

The app is built with standard Next.js (App Router) and can be deployed with one click to Vercel:

```bash
npx vercel
```
