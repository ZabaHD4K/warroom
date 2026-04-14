# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Database
```bash
docker compose up -d          # Start PostgreSQL 16 + PostGIS (port 5432)
```

### Backend (from /backend)
```bash
npm install
npm run dev        # Express + WebSocket on http://localhost:3001 (tsx watch)
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled output
npm run db:init    # Initialize schema (also runs automatically on startup)
```

### Frontend (from /frontend)
```bash
npm install
npm run dev        # Next.js on http://localhost:3000
npm run build
npm run lint       # ESLint
```

## Architecture

Two independent packages (no monorepo tooling) communicating via REST + WebSocket.

### Backend (Express + TypeScript)

**Data flow:** Scrapers → eventService.bulkUpsert() → broadcast via WebSocket → frontend reloads

- **Scrapers** (`src/scrapers/`): Three sources, each normalizing to `EventCreate`:
  - `acled.ts` — ACLED API, 500/page with pagination, 3 retries + exponential backoff. Requires `ACLED_API_KEY` + `ACLED_EMAIL`.
  - `gdelt.ts` — GDELT v2 CSV 15-min exports, ZIP decompression via AdmZip, filters by CAMEO root codes 14-20. No API key.
  - `rss.ts` — BBC/NYT/Al Jazeera, regex XML parser, keyword filtering, country detection via hardcoded centroids. No API key.
- **Scheduling** (node-cron in `index.ts`): GDELT every 15min, RSS hourly, ACLED every 6h. Initial scrape runs on startup.
- **Services** (`src/services/`):
  - `eventService.ts` — Bulk upsert (ON CONFLICT DO NOTHING), query builder with PostGIS bbox (ST_Within), filters by type/country/source/date.
  - `broadcast.ts` — WebSocket server on `/ws/events`, sends `{ type: "scraper_update", source, new_events }`.
  - `summaryService.ts` — Claude API (claude-sonnet-4-20250514) generates military analyst briefings from event data, stores in summaries table.
- **Routes** (`src/routes/`): `/api/events` (with bbox/filter params, default limit 200, max 1000), `/api/events/stats`, `/api/events/:id`, `/api/summaries/generate`, `/health`.

### Database (PostGIS)

Two tables: `events` (with GEOMETRY POINT 4326 + GIST index, UNIQUE on source+source_id) and `summaries` (with event_ids array reference). Schema auto-initializes in `src/db/init.ts`.

### Frontend (Next.js 16 + Deck.gl + MapLibre)

**WARNING:** This project uses Next.js 16.2.3 which has breaking changes from earlier versions. Read docs in `node_modules/next/dist/docs/` before modifying frontend code.

- **Map** (`ConflictMap.tsx`): MapLibre GL base map + Deck.gl ScatterplotLayer. Markers color-coded by event_type (colors defined in `src/lib/types.ts` as RGB tuples), radius scales with fatalities.
- **Hooks**: `useEvents` fetches events + listens to WebSocket for live reload. `useStats` fetches aggregation counters.
- **API client** (`src/lib/api.ts`): All backend calls. Uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).
- **Layout**: Full-screen dark theme (zinc-950). Stats bar top, filters overlay top-left, event list bottom (or event detail panel right when selected).
- Map component uses dynamic import with SSR disabled.

## Environment Variables

Backend `.env` (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://warroom:warroom@localhost:5432/warroom`)
- `ACLED_API_KEY` / `ACLED_EMAIL` — Optional, enables ACLED scraper
- `ANTHROPIC_API_KEY` — Optional, enables AI summaries
- `PORT` — Backend port (default: 3001)

Frontend:
- `NEXT_PUBLIC_API_URL` — Backend URL (default: `http://localhost:3001`)
