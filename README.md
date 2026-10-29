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

## Saving and synchronization

GameShare remains password-free. Lending actions commit the game and its affected
requests in one Firestore transaction. Only one handoff can be accepted per game;
receipt confirmation checks the current holder and request state again. Forms wait
for the shared save and preserve their input if it fails. Saving requires a connection.

Firestore is authoritative for existing loans. Catalog imports and metadata edits
preserve current custody, loan history, and requests. Sheets imports can initialize
loan state for newly imported games, but do not overwrite an existing loan.

Google Sheets is synchronized after the shared save. Failed updates remain in a
local retry queue; use **Retry Sheets sync**, reconnect, or reopen the app to retry.
Retries read the latest committed game rather than replaying an old borrower.
The device holding a pending queue must reconnect for its updates to be retried.

The cover-image proxy accepts only approved HTTPS providers, connects to a validated
public IPv4 address, rejects redirects, and limits responses to 10 MB of raster image
data. Custom images may still load directly in the browser; proxy fallback is
restricted to the providers listed in `src/lib/imageProxy.ts`.

## Regression checks

```bash
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
PLAYWRIGHT_PORT=3101 npx playwright test tests/persistence.spec.ts --project='Desktop Chrome' --project='Mobile Chrome (Android)'
```

The persistence browser tests block external/API traffic and never modify the shared
Firebase or Sheets data. Domain tests cover competing handoffs, stale confirmations,
return transitions, and duplicate requests. They do not replace a Firestore emulator
or staging integration test of multi-device transactions. Existing open tabs should
be refreshed after deployment to use the transactional lending code.

## Direct collection links

Link visitors directly to a household collection with `?owner=`. For example:

https://gamemenu.peji.ca/?owner=Angel%20%26%20Peter

These links apply the household filter and skip the initial install and identity
prompts, including the install banner. They do not select or change the visitor's
identity. Visitors can change filters normally; borrowing asks for identity when
needed. Encode the owner name in links (`&` must be `%26`).
